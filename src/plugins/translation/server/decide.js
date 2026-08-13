'use strict';

/**
 * PV-60 — la règle qui protège les corrections manuelles.
 *
 * Port exact de `scripts/translate/src/lib/decide.ts`. Les deux doivent rester
 * identiques : le script et le bouton lisent et écrivent le même `translationMeta`,
 * et une divergence ferait retraduire d'un côté ce que l'autre protège.
 *
 * Le principe tient en une phrase : on garde l'empreinte du texte source **et**
 * celle de la traduction produite. Si la traduction en base ne correspond plus à
 * ce qu'on avait écrit, c'est qu'un humain est passé — on n'y touche plus.
 */

const crypto = require('node:crypto');

const SOURCE_LOCALE = 'fr';
const TARGET_LOCALES = ['en', 'de', 'it', 'es', 'pt', 'el', 'nl', 'pl'];

const hash = (value) => crypto.createHash('sha1').update(value ?? '', 'utf8').digest('hex').slice(0, 16);

/**
 * Cinq états possibles pour un champ :
 *   write   — rien en base, à traduire
 *   refresh — le français a changé, la traduction est la nôtre : on rafraîchit
 *   skip    — à jour, rien à faire
 *   locked  — corrigé à la main : intouchable
 *   stale   — corrigé à la main, mais le français a bougé depuis : à revoir
 */
function decideField(sourceValue, targetValue, meta, field) {
  const hasSource = typeof sourceValue === 'string' && sourceValue.trim() !== '';
  if (!hasSource) return { action: 'skip', reason: 'source vide, rien à traduire' };

  const hasTarget = typeof targetValue === 'string' && targetValue.trim() !== '';
  if (!hasTarget) return { action: 'write', reason: 'aucune traduction en base' };

  const tracked = meta?.fields?.[field];
  if (!tracked) return { action: 'locked', reason: 'traduction non tracée, origine inconnue' };

  if (tracked.out !== hash(targetValue)) {
    return tracked.src === hash(sourceValue)
      ? { action: 'locked', reason: 'corrigé à la main' }
      : { action: 'stale', reason: 'corrigé à la main, mais la source a changé depuis' };
  }

  return tracked.src === hash(sourceValue)
    ? { action: 'skip', reason: 'à jour' }
    : { action: 'refresh', reason: 'source modifiée' };
}

const isWriting = (action) => action === 'write' || action === 'refresh';

/** Trace ce qu'on vient d'écrire, pour reconnaître plus tard une main humaine. */
function withFieldMeta(meta, field, { sourceValue, targetValue, engine }) {
  return {
    ...(meta ?? {}),
    fields: {
      ...(meta?.fields ?? {}),
      [field]: {
        src: hash(sourceValue),
        out: hash(targetValue),
        engine,
        at: new Date().toISOString(),
      },
    },
  };
}

/**
 * État d'ensemble d'une langue, tel que le panneau l'affiche.
 *
 * L'ordre des tests suit ce qui doit attirer l'œil : ce qui demande une action
 * l'emporte sur ce qui est simplement en ordre.
 */
function summarize(actions) {
  if (!actions.length) return 'skip';
  if (actions.includes('write')) return 'write';
  if (actions.includes('refresh')) return 'refresh';
  if (actions.includes('stale')) return 'stale';
  if (actions.includes('locked')) return 'locked';
  return 'skip';
}

module.exports = { SOURCE_LOCALE, TARGET_LOCALES, decideField, hash, isWriting, summarize, withFieldMeta };
