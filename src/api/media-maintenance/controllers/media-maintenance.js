'use strict';

const { stripBuffers } = require('../../../strip-media-buffers');

/**
 * Purge des binaires d'images stockés en base (PV-185).
 *
 * Le provider R2 écrivait une copie complète de chaque image dans `formats.*.buffer` — ~3,8 Go
 * répartis sur 4 449 médias en production. `strip-media-buffers` empêche désormais l'écriture ;
 * cette route nettoie ce qui est déjà là.
 *
 * Pourquoi une route et pas l'API d'upload : `POST /api/upload?id=x` ne met à jour que `fileInfo`
 * (nom, texte alternatif, légende) et ne permet pas de réécrire `formats`. Et Strapi Cloud n'ouvre
 * pas d'accès SQL. On passe donc par l'ORM.
 *
 * ⚠️ Traitement par LOTS : charger les médias avec leurs `formats` fait remonter les buffers en
 * mémoire. Un lot de 20 représente déjà ~18 Mo en moyenne, et jusqu'à 150 Mo si les pièces sont
 * lourdes — d'où un défaut volontairement bas.
 *
 *   GET  /api/media-maintenance/buffers?secret=…            → état des lieux, sans écriture
 *   POST /api/media-maintenance/buffers?secret=…&limit=200  → purge un lot
 */

const DEFAULT_BATCH = 20;

function assertAuthorized(ctx) {
  const expected = process.env.MEDIA_MAINTENANCE_SECRET;
  if (!expected) {
    ctx.throw(503, 'MEDIA_MAINTENANCE_SECRET non configuré');
  }
  if (ctx.query.secret !== expected) {
    ctx.throw(401, 'secret invalide');
  }
}

/** Compte les buffers d'un enregistrement sans le modifier. */
function countBuffers(file) {
  let formats = file.formats;
  if (typeof formats === 'string') {
    try { formats = JSON.parse(formats); } catch { return 0; }
  }
  let n = file.buffer !== undefined ? 1 : 0;
  if (formats && typeof formats === 'object') {
    for (const f of Object.values(formats)) {
      if (f && typeof f === 'object' && f.buffer !== undefined) n++;
    }
  }
  return n;
}

module.exports = {
  /** État des lieux : combien de médias portent encore un buffer, sur un échantillon. */
  async status(ctx) {
    assertAuthorized(ctx);
    const sample = Math.min(Number(ctx.query.sample) || 40, 200);

    const total = await strapi.db.query('plugin::upload.file').count({});
    const files = await strapi.db.query('plugin::upload.file').findMany({
      select: ['id', 'name', 'formats'],
      limit: sample,
      orderBy: { id: 'asc' },
    });

    let withBuffers = 0;
    let buffers = 0;
    let bytes = 0;
    for (const f of files) {
      const n = countBuffers(f);
      if (n) withBuffers++;
      buffers += n;
      bytes += JSON.stringify(f.formats ?? null).length;
    }

    ctx.body = {
      total_media: total,
      sample: files.length,
      with_buffers: withBuffers,
      buffers_in_sample: buffers,
      avg_formats_bytes: files.length ? Math.round(bytes / files.length) : 0,
      estimated_total_mb: files.length
        ? Math.round((bytes / files.length) * total / 1024 / 1024)
        : 0,
    };
  },

  /** Purge un lot. Rejouable : relancer jusqu'à `remaining: 0`. */
  async purge(ctx) {
    assertAuthorized(ctx);
    const limit = Math.min(Number(ctx.query.limit) || DEFAULT_BATCH, 100);

    const files = await strapi.db.query('plugin::upload.file').findMany({
      select: ['id', 'formats'],
      limit,
      orderBy: { id: 'asc' },
      // Seuls les médias portant encore un buffer nous intéressent ; le filtre JSON n'étant pas
      // portable, on trie côté applicatif et on avance par curseur d'id.
      where: ctx.query.after ? { id: { $gt: Number(ctx.query.after) } } : {},
    });

    let cleaned = 0;
    let untouched = 0;
    let lastId = null;

    for (const file of files) {
      lastId = file.id;
      const data = { formats: file.formats };
      const removed = stripBuffers(data);
      if (!removed) { untouched++; continue }
      await strapi.db.query('plugin::upload.file').update({
        where: { id: file.id },
        data: { formats: data.formats },
      });
      cleaned++;
    }

    ctx.body = {
      scanned: files.length,
      cleaned,
      untouched,
      last_id: lastId,
      done: files.length < limit,
    };
  },
};
