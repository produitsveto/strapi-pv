'use strict';

/**
 * PV-60 — état des traductions d'un document, et demande de traduction.
 *
 * Deux opérations, et une séparation nette entre les deux :
 *
 *   - `status` compare le français à chaque langue et dit ce qu'il y aurait à
 *     faire. Il ne coûte rien, ne modifie rien, et ne dépend que de Strapi.
 *
 *   - `run` ne traduit pas : il demande au dépôt d'exécuter le script, qui
 *     tourne sur le runner du VPS. Traduire ici supposerait de réimplémenter le
 *     prompt, le glossaire et la protection des corrections manuelles, donc de
 *     tenir deux versions alignées — et de faire tenir plusieurs minutes de
 *     traitement dans une requête HTTP, ce que le proxy ne permet pas.
 *
 * La règle de décision, elle, est bien ici : le panneau doit pouvoir afficher
 * l'état sans rien déclencher. Elle est identique à celle du script (`decide.js`).
 */

const { SOURCE_LOCALE, TARGET_LOCALES, decideField, summarize } = require('./decide');
const { buildPopulate, collectTextNodes, hasTranslatableFields } = require('./schema');

/** Le brouillon est ce que l'éditeur a sous les yeux : c'est lui qui fait foi. */
const STATUS = 'draft';

const DEFAULT_REPOSITORY = 'produitsveto/pv-storefronts';
const DEFAULT_WORKFLOW = 'translate-document.yml';
const DEFAULT_REF = 'main';

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

/** Appel à l'API du dépôt, avec le jeton réservé à ce seul usage. */
async function github(path, options = {}) {
  const token = process.env.TRANSLATION_DISPATCH_TOKEN;
  if (!token) {
    throw new Error(
      "La traduction à la demande n'est pas configurée sur ce serveur (variable TRANSLATION_DISPATCH_TOKEN)."
    );
  }

  const repository = process.env.TRANSLATION_REPOSITORY || DEFAULT_REPOSITORY;
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Déclenchement refusé (${response.status}) : ${detail.slice(0, 200)}`);
  }
  // Un déclenchement accepté ne renvoie pas de corps.
  return response.status === 204 ? null : response.json();
}

module.exports = ({ strapi }) => ({
  /** Vrai si le contenu comporte des champs traduisibles : sinon, pas de panneau. */
  isTranslatable(uid) {
    const model = strapi.contentTypes[uid];
    if (!model?.pluginOptions?.i18n?.localized) return false;
    return hasTranslatableFields(strapi, model.attributes, uid);
  },

  async status({ uid, documentId }) {
    const model = contentType(strapi, uid);
    const source = await loadDocument(strapi, uid, documentId, SOURCE_LOCALE);
    if (!source) return { available: false, reason: 'Aucune version française à traduire.' };

    const fields = collectTextNodes(strapi, model.attributes, source, '', uid);
    if (!fields.length) return { available: false, reason: 'Aucun texte à traduire sur ce contenu.' };

    const locales = [];
    for (const locale of TARGET_LOCALES) {
      const target = await loadDocument(strapi, uid, documentId, locale);
      const meta = target?.translationMeta ?? null;
      const targetValues = new Map(
        (target ? collectTextNodes(strapi, model.attributes, target, '', uid) : []).map((f) => [
          f.path,
          f.value,
        ])
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

  /**
   * Demande la traduction du document.
   *
   * Retour immédiat : le traitement dure plusieurs minutes et se poursuit sans
   * que personne n'ait à garder la page ouverte.
   */
  async run({ uid, documentId, locales }) {
    const model = contentType(strapi, uid);
    const workflow = process.env.TRANSLATION_WORKFLOW || DEFAULT_WORKFLOW;
    const wanted = (locales ?? []).filter((l) => TARGET_LOCALES.includes(l));

    await github(`/actions/workflows/${workflow}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({
        ref: process.env.TRANSLATION_REF || DEFAULT_REF,
        inputs: {
          uid,
          // Un single type n'a pas d'identifiant : le champ doit rester présent
          // et vide, sinon GitHub refuse l'entrée.
          documentId: model.kind === 'singleType' ? '' : (documentId ?? ''),
          locales: wanted.join(','),
        },
      }),
    });

    return { dispatched: true };
  },

  /**
   * État de la dernière exécution, pour que le panneau montre l'avancement.
   *
   * Sans ça, un clic sur « Traduire » resterait sans retour visible jusqu'à ce
   * que les traductions apparaissent, plusieurs minutes plus tard.
   */
  async lastRun() {
    const workflow = process.env.TRANSLATION_WORKFLOW || DEFAULT_WORKFLOW;
    const data = await github(`/actions/workflows/${workflow}/runs?per_page=1`);
    const run = data?.workflow_runs?.[0];
    if (!run) return { run: null };

    return {
      run: {
        status: run.status,
        conclusion: run.conclusion,
        startedAt: run.run_started_at,
        url: run.html_url,
      },
    };
  },
});
