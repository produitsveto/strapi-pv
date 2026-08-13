'use strict';

/**
 * PV-60 — champs traduisibles d'un contenu, déduits du schéma.
 *
 * Contrepartie serveur de `scripts/translate/src/lib/content-walk.ts`, qui rend
 * le même service au script en ligne de commande. Les deux appliquent les mêmes
 * règles ; ici les schémas sont lus depuis `strapi.contentTypes` plutôt que
 * depuis les fichiers, ce qui évite d'aller les chercher sur le disque.
 *
 * Toute évolution des règles doit être reportée des deux côtés — c'est le prix
 * d'un bouton qui fonctionne sans dépendre d'une machine de développement.
 */

const TEXT_TYPES = new Set(['string', 'text', 'richtext']);

/** Composants traversés sans être traduits : adresses, identifiants, médias. */
const SKIP_COMPONENTS = new Set([
  'shared.media',
  'shared.slider',
  'shared.postal-address',
  'shared.social-link',
  'shared.medication',
]);

/** Champs texte qui n'en sont pas : identifiants, URL, noms d'icônes. */
const SKIP_FIELDS = new Set([
  'link',
  'url',
  'canonicalUrl',
  'productHandle',
  'dealRefId',
  'icon',
  'platform',
  'name',
  'slug',
  'handle',
]);

const RESERVED = new Set([
  'id',
  'documentId',
  'locale',
  'localizations',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'translationMeta',
]);

const isLocalized = (attr) => attr?.pluginOptions?.i18n?.localized === true;

const componentAttributes = (strapi, uid) => strapi.components?.[uid]?.attributes ?? null;

/** Vrai si le contenu porte au moins un champ traduisible. */
function hasTranslatableFields(strapi, attributes) {
  return Object.entries(attributes ?? {}).some(([name, attr]) => {
    if (RESERVED.has(name) || !isLocalized(attr)) return false;
    if (TEXT_TYPES.has(attr.type)) return !SKIP_FIELDS.has(name);
    if (attr.type === 'component') {
      return !SKIP_COMPONENTS.has(attr.component) && Boolean(componentAttributes(strapi, attr.component));
    }
    return attr.type === 'dynamiczone';
  });
}

/**
 * Relève les textes traduisibles, avec un chemin stable par champ.
 *
 * Ce chemin (`blocks.2.body`) sert de clé au suivi des corrections manuelles :
 * il doit rester identique à celui produit par le script, sans quoi une
 * traduction protégée d'un côté serait retraduite de l'autre.
 */
function collectTextNodes(strapi, attributes, data, prefix = '') {
  if (!data || typeof data !== 'object') return [];
  const out = [];

  for (const [name, attr] of Object.entries(attributes ?? {})) {
    if (RESERVED.has(name)) continue;
    if (prefix === '' && !isLocalized(attr)) continue;

    const value = data[name];
    const path = prefix ? `${prefix}.${name}` : name;

    if (TEXT_TYPES.has(attr.type)) {
      if (SKIP_FIELDS.has(name)) continue;
      if (typeof value === 'string' && value.trim()) {
        out.push({ path, value, maxLength: attr.maxLength });
      }
      continue;
    }

    if (attr.type === 'dynamiczone' && Array.isArray(value)) {
      value.forEach((block, i) => {
        const component = block?.__component;
        if (typeof component !== 'string' || SKIP_COMPONENTS.has(component)) return;
        const sub = componentAttributes(strapi, component);
        if (sub) out.push(...collectTextNodes(strapi, sub, block, `${path}.${i}`));
      });
      continue;
    }

    if (attr.type === 'component' && attr.component && !SKIP_COMPONENTS.has(attr.component)) {
      const sub = componentAttributes(strapi, attr.component);
      if (!sub) continue;
      if (attr.repeatable && Array.isArray(value)) {
        value.forEach((item, i) => out.push(...collectTextNodes(strapi, sub, item, `${path}.${i}`)));
      } else if (value && typeof value === 'object') {
        out.push(...collectTextNodes(strapi, sub, value, path));
      }
    }
  }

  return out;
}

/**
 * Reconstruit la valeur à écrire à partir de `base`.
 *
 * `base` est la version de la langue visée, jamais la française : repartir de
 * la source réécrirait en français les champs qu'on vient de décider de ne pas
 * retraduire. C'est ce qui a abîmé 670 noms de produits (PV-193).
 */
function rebuild(strapi, attributes, base, translations, prefix = '') {
  const source = base ?? {};
  const out = {};

  for (const [name, attr] of Object.entries(attributes ?? {})) {
    if (RESERVED.has(name)) continue;
    if (!(name in source)) continue;
    const value = source[name];
    const path = prefix ? `${prefix}.${name}` : name;

    if (TEXT_TYPES.has(attr.type)) {
      const translated = translations.get(path);
      out[name] = translated !== undefined ? translated : value;
      continue;
    }

    if (attr.type === 'media') {
      out[name] = reduceMedia(value);
      continue;
    }

    if (attr.type === 'dynamiczone' && Array.isArray(value)) {
      out[name] = value.map((block, i) => {
        const sub = componentAttributes(strapi, block?.__component);
        if (!sub) return withoutIds(block);
        return {
          __component: block.__component,
          ...rebuild(strapi, sub, block, translations, `${path}.${i}`),
        };
      });
      continue;
    }

    if (attr.type === 'component' && attr.component) {
      const sub = componentAttributes(strapi, attr.component);
      if (!sub) {
        out[name] = Array.isArray(value) ? value.map(withoutIds) : withoutIds(value);
      } else if (attr.repeatable && Array.isArray(value)) {
        out[name] = value.map((item, i) => rebuild(strapi, sub, item, translations, `${path}.${i}`));
      } else if (value && typeof value === 'object') {
        out[name] = rebuild(strapi, sub, value, translations, path);
      } else {
        out[name] = value;
      }
      continue;
    }

    out[name] = value;
  }

  return out;
}

function reduceMedia(value) {
  if (Array.isArray(value)) return value.map(reduceMedia);
  if (value && typeof value === 'object' && 'id' in value) return value.id;
  return value;
}

function withoutIds(value) {
  if (!value || typeof value !== 'object') return value;
  const { id, documentId, ...rest } = value;
  return rest;
}

/** Peuplement profond, pour que les composants imbriqués ne reviennent pas vides. */
function buildPopulate(strapi, attributes, depth = 0) {
  if (depth > 4) return undefined;
  const populate = {};

  for (const [name, attr] of Object.entries(attributes ?? {})) {
    if (RESERVED.has(name)) continue;
    if (attr.type === 'media') {
      populate[name] = true;
    } else if (attr.type === 'dynamiczone') {
      populate[name] = { populate: '*' };
    } else if (attr.type === 'component' && attr.component) {
      const sub = componentAttributes(strapi, attr.component);
      const nested = sub ? buildPopulate(strapi, sub, depth + 1) : undefined;
      populate[name] = nested && Object.keys(nested).length ? { populate: nested } : { populate: '*' };
    }
  }

  return populate;
}

module.exports = {
  TEXT_TYPES,
  buildPopulate,
  collectTextNodes,
  hasTranslatableFields,
  isLocalized,
  rebuild,
};
