'use strict';

/**
 * PV-357 — la « Date de publication » (`publishAt`) d'un article est remplie à sa première
 * publication quand la rédaction l'a laissée vide.
 *
 * Le blog trie et date les articles sur ce seul champ. Avant, il lisait `wpDate`, la date de
 * l'import WordPress : vide pour tout article écrit dans Strapi, si bien qu'en Postgres (vides en
 * tête d'un tri décroissant) ces articles passaient devant tous les autres, sans date affichée et
 * dans un ordre quelconque. `publishedAt` ne convient pas : Strapi le réécrit à chaque
 * republication (tout le blog affichait le 22/09, jour de la republication en masse).
 *
 * Une date déjà saisie (programmation PV-204, ou correction à la main) n'est jamais touchée ; une
 * dépublication suivie d'une republication garde la date d'origine.
 *
 * Écriture par `strapi.db.query` : le champ n'est pas traduit, toutes les lignes du document
 * (brouillon, version publiée, chaque langue) reçoivent la même date, sans repasser par les
 * middlewares du Document Service.
 */

const UID = 'api::article.article';

/** Publication par l'admin (`publish`) ou par l'API REST (`status: 'published'`, PV-228). */
function isPublication(context) {
  if (context.action === 'publish') return true;
  return (context.action === 'create' || context.action === 'update') && context.params?.status === 'published';
}

function registerArticlePublishDate({ strapi }) {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== UID || !isPublication(context)) return next();

    const documentId = context.params?.documentId;
    const data = context.params?.data;
    // Date fournie avec l'écriture elle-même : c'est elle qui fait foi.
    if (data?.publishAt) return next();

    const now = new Date();
    if (!documentId) {
      // Création publiée d'emblée : pas encore de ligne à compléter.
      if (data) data.publishAt = now;
      return next();
    }

    try {
      const dated = await strapi.db.query(UID).findOne({
        where: { documentId, publishAt: { $notNull: true } },
        select: ['publishAt'],
      });
      if (!dated) {
        await strapi.db.query(UID).updateMany({
          where: { documentId, publishAt: { $null: true } },
          data: { publishAt: now },
        });
      }
    } catch (err) {
      // Une date manquante se rattrape à la main ; elle ne doit pas bloquer la publication.
      strapi.log.warn(`[article] ${documentId} : date de publication non posée (${err.message})`);
    }
    return next();
  });
}

module.exports = { registerArticlePublishDate };
