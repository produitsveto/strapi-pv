'use strict';

/**
 * PV-60 — état et exécution des traductions d'un document.
 *
 * Deux opérations seulement :
 *   - `status` ne coûte rien et ne modifie rien : il compare le français à
 *     chaque langue et dit ce qui mériterait d'être fait ;
 *   - `run` traduit ce que `status` a signalé, et rien d'autre.
 *
 * C'est la même règle que le script en ligne de commande qui décide dans les
 * deux cas : une traduction corrigée à la main n'est jamais retouchée, et un
 * clic sur le bouton ne peut donc pas défaire le travail de quelqu'un.
 */

const { SOURCE_LOCALE, TARGET_LOCALES, decideField, isWriting, summarize, withFieldMeta } = require('./decide');
const { buildGlossary, translate } = require('./engine');
const { buildPopulate, collectTextNodes, hasTranslatableFields, isLocalized, rebuild } = require('./schema');

/** Le brouillon est ce que l'éditeur a sous les yeux : c'est lui qui fait foi. */
const STATUS = 'draft';

function contentType(strapi, uid) {
  const model = strapi.contentTypes[uid];
  if (!model) throw new Error(`Contenu inconnu : ${uid}`);
  return model;
}

async function loadDocument(strapi, uid, documentId, locale) {
  const model = contentType(strapi, uid);
  return strapi.documents(uid).findOne({
    documentId,
    locale,
    status: STATUS,
    populate: buildPopulate(strapi, model.attributes),
  });
}

/**
 * Champs partagés par toutes les locales, relus depuis le français.
 *
 * Les omettre d'une écriture les vide pour toutes les langues à la fois — c'est
 * ce qui a effacé 109 fiches marque et 732 blocs SEO (PV-193).
 */
function nonLocalizedFields(strapi, attributes, source) {
  const out = {};
  for (const [name, attr] of Object.entries(attributes ?? {})) {
    if (isLocalized(attr) || attr.type === 'relation' || name === 'translationMeta') continue;
    if (['id', 'documentId', 'locale', 'createdAt', 'updatedAt', 'publishedAt'].includes(name)) continue;
    if (source && name in source) out[name] = source[name];
  }
  return out;
}

module.exports = ({ strapi }) => ({
  /** Vrai si le contenu comporte des champs traduisibles : sinon, pas de panneau. */
  isTranslatable(uid) {
    const model = strapi.contentTypes[uid];
    if (!model) return false;
    // Sans i18n activée, la notion de traduction n'a pas de sens ici.
    if (!model.pluginOptions?.i18n?.localized) return false;
    return hasTranslatableFields(strapi, model.attributes);
  },

  async status({ uid, documentId }) {
    const model = contentType(strapi, uid);
    const source = await loadDocument(strapi, uid, documentId, SOURCE_LOCALE);
    if (!source) return { available: false, reason: 'Aucune version française à traduire.' };

    const fields = collectTextNodes(strapi, model.attributes, source);
    if (!fields.length) return { available: false, reason: 'Aucun texte à traduire sur ce contenu.' };

    const locales = [];
    for (const locale of TARGET_LOCALES) {
      const target = await loadDocument(strapi, uid, documentId, locale);
      const meta = target?.translationMeta ?? null;
      const targetValues = new Map(
        (target ? collectTextNodes(strapi, model.attributes, target) : []).map((f) => [f.path, f.value])
      );

      const counts = { write: 0, refresh: 0, skip: 0, locked: 0, stale: 0 };
      for (const field of fields) {
        const { action } = decideField(field.value, targetValues.get(field.path) ?? '', meta, field.path);
        counts[action] += 1;
      }

      locales.push({
        locale,
        state: summarize(Object.entries(counts).flatMap(([k, n]) => (n > 0 ? [k] : []))),
        counts,
        todo: counts.write + counts.refresh,
      });
    }

    return { available: true, fields: fields.length, locales };
  },

  async run({ uid, documentId, locales }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "La clé d'API de traduction n'est pas configurée sur ce serveur (variable ANTHROPIC_API_KEY)."
      );
    }

    const model = contentType(strapi, uid);
    const source = await loadDocument(strapi, uid, documentId, SOURCE_LOCALE);
    if (!source) throw new Error('Aucune version française à traduire.');

    const fields = collectTextNodes(strapi, model.attributes, source);
    if (!fields.length) throw new Error('Aucun texte à traduire sur ce contenu.');

    const targets = (locales?.length ? locales : TARGET_LOCALES).filter((l) => TARGET_LOCALES.includes(l));
    const glossary = await buildGlossary(strapi);
    const shared = nonLocalizedFields(strapi, model.attributes, source);
    const label = model.info?.displayName ?? uid;

    const results = [];
    for (const locale of targets) {
      const target = await loadDocument(strapi, uid, documentId, locale);
      const meta = target?.translationMeta ?? null;
      const targetNodes = target ? collectTextNodes(strapi, model.attributes, target) : [];
      const targetValues = new Map(targetNodes.map((f) => [f.path, f.value]));

      // Une structure qui a bougé côté français ne peut plus servir de base :
      // les chemins ne désignent plus les mêmes blocs.
      const sameShape =
        Boolean(target) &&
        fields.length === targetNodes.length &&
        fields.every((f, i) => f.path === targetNodes[i]?.path);

      const kept = new Map();
      const warnings = [];
      let translated = 0;
      let nextMeta = meta;

      for (const field of fields) {
        const current = targetValues.get(field.path) ?? '';
        const { action } = decideField(field.value, current, meta, field.path);
        if (!isWriting(action)) {
          if (current) kept.set(field.path, current);
          continue;
        }

        const result = await translate({
          apiKey,
          model: process.env.TRANSLATION_MODEL,
          glossary,
          text: field.value,
          targetLocale: locale,
          maxLength: field.maxLength,
          context: `${label}, champ ${field.path}`,
        });

        kept.set(field.path, result.text);
        translated += 1;
        if (result.warnings.length) warnings.push(`${field.path} : ${result.warnings[0]}`);
        nextMeta = withFieldMeta(nextMeta, field.path, {
          sourceValue: field.value,
          targetValue: result.text,
          engine: process.env.TRANSLATION_MODEL || 'claude-sonnet-5',
        });
      }

      if (!translated) {
        results.push({ locale, translated: 0, warnings: [] });
        continue;
      }

      const data = {
        ...shared,
        ...rebuild(strapi, model.attributes, sameShape ? target : source, kept),
        translationMeta: nextMeta,
      };

      await strapi.documents(uid).update({ documentId, locale, data });
      // La langue suit le français : si la version française est en ligne, sa
      // traduction n'a pas de raison d'attendre dans les brouillons.
      if (source.publishedAt) {
        await strapi.documents(uid).publish({ documentId, locale });
      }

      results.push({ locale, translated, warnings });
    }

    return { results };
  },
});
