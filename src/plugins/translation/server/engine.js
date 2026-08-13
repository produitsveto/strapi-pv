'use strict';

/**
 * PV-60 — moteur de traduction du bouton Strapi.
 *
 * Contrepartie serveur de `scripts/translate/src/lib/engine.ts` et
 * `glossary.ts`. Le script en ligne de commande garde la main sur les gros
 * volumes — il seul sait grouper des dizaines de milliers de traductions en
 * lots à tarif réduit. Ce module-ci traite l'unitaire : une fiche qu'on vient de
 * modifier, quelques champs, tout de suite.
 *
 * Les règles de traduction sont les mêmes des deux côtés, et doivent le rester :
 * même prompt, même glossaire, mêmes contrôles après coup. Une divergence
 * produirait deux qualités de traduction dans le même catalogue.
 */

const LANGUAGE_NAMES = {
  en: 'anglais',
  de: 'allemand',
  it: 'italien',
  es: 'espagnol',
  pt: 'portugais',
  el: 'grec',
  nl: 'néerlandais',
  pl: 'polonais',
};

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-5';

/** Motifs préservés tels quels, quelle que soit la langue cible. */
const PROTECTED_PATTERNS = [
  { name: 'dosage', pattern: /\b\d+(?:[.,]\d+)?\s?(?:mg|g|kg|ml|cl|l|UI|%)(?:\/(?:ml|kg|j))?(?![a-zà-ÿ])/gi },
  { name: 'amm', pattern: /\bFR\s?\/\s?V\s?\/[\d\s/]+\b/gi },
  { name: 'reference', pattern: /\b(?:REF|EAN|CIP)[-\s]?\d{4,}\b/gi },
];

/**
 * Construit le glossaire depuis les laboratoires du catalogue.
 *
 * Entretenir une liste à la main se périmerait au premier laboratoire ajouté.
 * Les doublons sont écartés : le catalogue compte environ deux fiches par nom.
 */
async function buildGlossary(strapi) {
  let entries = [];
  try {
    entries = await strapi.documents('api::laboratory.laboratory').findMany({
      locale: 'fr',
      fields: ['name'],
      limit: -1,
    });
  } catch {
    // Un glossaire vide dégrade la traduction sans l'empêcher : mieux vaut
    // traduire sans que de refuser de traduire.
    entries = [];
  }

  const brands = [...new Set(entries.map((e) => (e?.name ?? '').trim()).filter((n) => n.length > 1))]
    // Les plus longs d'abord : « BOEHRINGER INGELHEIM » avant « BOEHRINGER ».
    .sort((a, b) => b.length - a.length);

  return { brands, promptSection: () => promptSection(brands) };
}

function promptSection(brands) {
  return [
    'Restitue caractère pour caractère, sans jamais les traduire ni les adapter :',
    '- les noms de marques et de laboratoires listés ci-dessous ;',
    '- les noms commerciaux de produits, y compris les qualificatifs qui en font',
    "  partie (« Capstar Petit Chien » reste « Capstar Petit Chien », même si",
    '  « Petit Chien » se traduirait naturellement) ;',
    '- les dosages, contenances et unités (127 ml, 1,5 kg, 50 mg/ml, 100 UI, 20 %) ;',
    "- les numéros d'AMM, références produit, codes EAN et CIP.",
    '',
    "N'emploie jamais l'équivalent local d'une unité de mesure : les symboles",
    'internationaux kg, g, mg, ml, cl, L, UI et % restent écrits ainsi dans',
    'toutes les langues, y compris celles qui ne s’écrivent pas en alphabet',
    'latin. Écris « 8 kg », jamais « 8 κιλών » ni « 8 kilogramów ».',
    '',
    'Les dénominations communes de principes actifs suivent en revanche l’usage',
    'de la langue cible : translittère-les si c’est la norme (le grec le fait),',
    'garde la forme d’origine sinon. Ne les remplace jamais par un synonyme.',
    '',
    'Marques et laboratoires :',
    brands.join(', '),
  ].join('\n');
}

function buildSystemPrompt(glossary, targetLocale, isHtml) {
  const language = LANGUAGE_NAMES[targetLocale] ?? targetLocale;
  return [
    `Tu traduis du français vers le ${language} le contenu d'un site de produits vétérinaires.`,
    '',
    glossary.promptSection(),
    '',
    isHtml
      ? [
          'Le texte est du HTML. Restitue exactement la même structure : mêmes balises,',
          'mêmes attributs, même ordre, même imbrication. Ne traduis que le texte visible.',
          "N'ajoute, ne supprime ni ne fusionne aucune balise.",
        ].join('\n')
      : 'Restitue un texte simple, sans balisage ajouté.',
    '',
    'Le registre est celui de fiches produit lues par des propriétaires d’animaux et des',
    'professionnels : précis, sobre, sans emphase commerciale ajoutée.',
    '',
    'Le texte à traduire peut être précédé d’un en-tête suivi d’une ligne « --- » :',
    'un contexte qui lève les ambiguïtés d’un mot isolé, une contrainte de longueur,',
    'ou les deux. Sers-t’en, respecte-les, et ne traduis jamais l’en-tête lui-même.',
    '',
    'Un texte très court est un libellé, pas une question : traduis-le, n’y réponds pas.',
    '',
    'Réponds uniquement par la traduction, sans préambule, commentaire ni guillemets.',
  ].join('\n');
}

function buildUserMessage(text, maxLength, context) {
  const header = [];
  if (context) header.push(`Contexte : ${context}`);
  if (maxLength) header.push(`Contrainte : la traduction ne doit pas dépasser ${maxLength} caractères.`);
  return header.length ? `${header.join('\n')}\n---\n${text}` : text;
}

const looksLikeHtml = (text) => /<\/?[a-z][\s\S]*>/i.test(text);

/** La sortie suit la longueur de l'entrée : les langues cibles sont plus verbeuses. */
const maxTokensFor = (text) => Math.min(Math.max(Math.ceil((text.length / 2.2) * 1.6) + 1000, 8000), 60000);

const compact = (text) =>
  text
    .replace(/(\d)[,](\d)/g, '$1.$2')
    .replace(/\s+/g, '')
    .toLowerCase();

/** Termes présents dans la source mais absents de la traduction. */
function findMissingProtectedTerms(source, translated, brands) {
  const missing = [];
  const compactTranslated = compact(translated);

  for (const brand of brands) {
    if (source.includes(brand) && !compactTranslated.includes(compact(brand))) missing.push(brand);
  }
  for (const { pattern } of PROTECTED_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      if (!compactTranslated.includes(compact(match[0]))) missing.push(match[0]);
    }
  }
  return [...new Set(missing)];
}

const countTags = (text) => (text.match(/<[a-z][^>]*>/gi) ?? []).length;

/** Contrôles après coup : une traduction douteuse ne doit pas être écrite en silence. */
function collectWarnings(source, translated, brands, isHtml, maxLength) {
  const warnings = [];

  if (maxLength && translated.length > maxLength) {
    warnings.push(`dépasse la limite du champ (${translated.length} > ${maxLength} caractères)`);
  }
  if (source.length > 0 && translated.length > source.length * 3 && translated.length - source.length > 200) {
    warnings.push(`longueur disproportionnée (${translated.length} caractères pour ${source.length})`);
  }
  if (source.trim() === translated.trim()) {
    warnings.push('la traduction est identique au texte source');
  }
  if (isHtml) {
    const before = countTags(source);
    const after = countTags(translated);
    if (before !== after) warnings.push(`structure HTML : ${before} balises en français, ${after} après traduction`);
  }
  const missing = findMissingProtectedTerms(source, translated, brands);
  if (missing.length) warnings.push(`termes protégés absents : ${missing.join(', ')}`);

  return warnings;
}

/**
 * Traduit un texte.
 *
 * Une anomalie relevée après coup vient rarement du texte source : c'est un
 * aléa de génération, qu'une seconde tentative efface le plus souvent. On garde
 * la meilleure des deux, la première l'emportant à égalité pour que rejouer ne
 * rende pas le résultat instable.
 */
async function translate({ apiKey, model, glossary, text, targetLocale, maxLength, context, retries = 1 }) {
  const isHtml = looksLikeHtml(text);
  const maxTokens = maxTokensFor(text);
  let best = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: buildSystemPrompt(glossary, targetLocale, isHtml),
            // Le glossaire pèse plus de mille tokens, identiques à chaque appel.
            cache_control: { type: 'ephemeral', ttl: '1h' },
          },
        ],
        messages: [{ role: 'user', content: buildUserMessage(text, maxLength, context) }],
        ...(model && model.startsWith('claude-haiku')
          ? {}
          : { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } }),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`API de traduction : ${response.status} ${detail.slice(0, 200)}`);
    }

    const payload = await response.json();
    if (payload.stop_reason === 'max_tokens') throw new Error('Traduction tronquée');

    const candidate = (payload.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
    if (!candidate) throw new Error('Réponse vide du modèle');

    const warnings = collectWarnings(text, candidate, glossary.brands, isHtml, maxLength);
    if (!best || warnings.length < best.warnings.length) best = { text: candidate, warnings };
    if (!warnings.length) break;
  }

  return best;
}

module.exports = { LANGUAGE_NAMES, buildGlossary, collectWarnings, looksLikeHtml, translate };
