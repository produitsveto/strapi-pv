'use strict';

/**
 * PV-357 — reprise de la « Date de publication » (`publishAt`) des articles déjà publiés.
 *
 * Le blog trie et date désormais les articles sur ce seul champ (voir src/article-publish-date.js,
 * qui le remplit à la première publication). Les articles existants le reçoivent ici :
 *  - un article importé de WordPress : sa date WordPress (`wp_date`) ;
 *  - un article écrit dans Strapi avant ce correctif : sa date de création, faute de mieux
 *    (`published_at` a été réécrit par la republication en masse du 22/09).
 *
 * Le champ n'est pas traduit : toutes les lignes d'un document (brouillon, version publiée, chaque
 * langue) reçoivent la même date. Une date déjà posée sur l'une d'elles (article programmé) gagne.
 * Les brouillons jamais publiés restent vides : ils recevront leur date en paraissant.
 *
 * Toutes les dates reprises sont passées : aucun article ne change de visibilité.
 */

const TABLE = 'articles';

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(TABLE))) return;
    for (const column of ['publish_at', 'wp_date', 'document_id', 'published_at']) {
      if (!(await knex.schema.hasColumn(TABLE, column))) return;
    }

    const published = await knex(TABLE).distinct('document_id').whereNotNull('published_at');
    const documentIds = published.map((row) => row.document_id).filter(Boolean);

    for (const documentId of documentIds) {
      const rows = await knex(TABLE)
        .select('publish_at', 'wp_date', 'created_at')
        .where({ document_id: documentId });
      if (rows.every((row) => row.publish_at != null)) continue;

      const earliest = (key) => rows
        .map((row) => row[key])
        .filter((value) => value != null)
        .sort((a, b) => new Date(a) - new Date(b))[0];
      const date = earliest('publish_at') ?? earliest('wp_date') ?? earliest('created_at');
      if (date == null) continue;

      await knex(TABLE)
        .where({ document_id: documentId })
        .whereNull('publish_at')
        .update({ publish_at: date });
    }
  },
};
