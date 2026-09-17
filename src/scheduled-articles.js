'use strict';

/**
 * PV-255 — purge du cache des storefronts à la parution d'un article programmé.
 *
 * Un article programmé (PV-204) est publié dans Strapi dès son enregistrement ; c'est le filtre
 * `publishAt <= maintenant` des storefronts qui le masque. À l'heure dite, rien n'est écrit, donc
 * rien ne purge : tant que les listes du blog et les articles d'une fiche produit restaient 1 h en
 * cache, l'article paraissait dans l'heure. Pour les garder 7 jours en cache, cette tâche repère
 * toutes les 5 minutes les articles dont la date vient de passer, et les purge comme une publication.
 *
 * Lecture en base : aucune requête API, rien sur le quota Strapi Cloud.
 */

const JOB_NAME = 'pvScheduledArticlesPurge';
const RULE = '*/5 * * * *';
const STORE_KEY = 'scheduled-articles-last-check';

async function purgeDueArticles(strapi, enqueueDocuments) {
  const store = strapi.store({ type: 'core', name: 'pv-revalidate' });
  const now = new Date();
  const lastCheck = await store.get({ key: STORE_KEY });

  // Premier passage : on part de maintenant, sans rejouer les parutions passées.
  if (lastCheck) {
    const rows = await strapi.db.query('api::article.article').findMany({
      where: {
        publishAt: { $gt: new Date(lastCheck), $lte: now },
        publishedAt: { $notNull: true },
      },
      select: ['documentId'],
    });
    const documentIds = [...new Set(rows.map((row) => row.documentId).filter(Boolean))];
    if (documentIds.length) {
      strapi.log.info(`[revalidate] ${documentIds.length} article(s) programmé(s) paru(s) depuis ${lastCheck}`);
      enqueueDocuments('api::article.article', documentIds, `parution programmée de ${documentIds.length} article(s)`);
    }
  }

  // Après la lecture seulement : un passage qui échoue sera repris par le suivant, sur la même fenêtre.
  await store.set({ key: STORE_KEY, value: now.toISOString() });
}

function registerScheduledArticlesPurge({ strapi, revalidation }) {
  // Sans cible de purge configurée (dev local), rien à faire.
  if (!revalidation?.enqueueDocuments) return;

  strapi.cron.add({
    [JOB_NAME]: {
      task: async () => {
        try {
          await purgeDueArticles(strapi, revalidation.enqueueDocuments);
        } catch (err) {
          strapi.log.warn(`[revalidate] articles programmés non vérifiés (${err.message})`);
        }
      },
      options: { rule: RULE },
    },
  });
  strapi.log.info(`[revalidate] parutions d'articles programmés vérifiées toutes les 5 min`);
}

module.exports = { registerScheduledArticlesPurge, purgeDueArticles };
