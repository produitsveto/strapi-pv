'use strict';

/**
 * PV-233 — une campagne marketing peut viser plusieurs marques (ex. DRONTAL et son laboratoire
 * VETOQUINOL). Le champ à marque unique `brand_handle` disparaît au profit de la liste
 * `brand_handles`, jusque-là réservée aux marques à la une du méga-menu.
 *
 * Strapi joue les migrations au démarrage, AVANT la synchronisation du schéma qui supprime la
 * colonne : la marque déjà saisie est recopiée en tête de la liste. Brouillon et version publiée
 * sont deux lignes distinctes, toutes deux reprises.
 *
 * Gardes : table absente (base neuve, créée après les migrations) ou colonne déjà supprimée →
 * rien à faire.
 */

const TABLE = 'marketing_campaigns';

/** Même lecture que le storefront (`arr()` de server/utils/marketing-campaigns.ts). */
function toList(value) {
  let v = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      // texte brut, découpé ci-dessous
    }
  }
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(TABLE))) return;
    if (!(await knex.schema.hasColumn(TABLE, 'brand_handle'))) return;

    const rows = await knex(TABLE)
      .select('id', 'brand_handle', 'brand_handles')
      .whereNotNull('brand_handle');

    for (const row of rows) {
      const brand = String(row.brand_handle).trim();
      if (!brand) continue;
      const list = toList(row.brand_handles);
      if (list.includes(brand)) continue;
      await knex(TABLE)
        .where({ id: row.id })
        .update({ brand_handles: JSON.stringify([brand, ...list]) });
    }
  },
};
