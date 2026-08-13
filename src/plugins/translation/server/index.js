'use strict';

/**
 * PV-60 — plugin « Traduction ».
 *
 * Ajoute au Content Manager un panneau qui montre, langue par langue, l'état des
 * traductions d'un contenu, et un bouton pour ne relancer que ce qui en a besoin.
 * Demande du client : éviter de repasser tout le catalogue quand une seule fiche
 * a changé.
 *
 * Les routes sont de type `admin` : elles ne sont accessibles qu'à une session
 * du back-office, jamais depuis l'API publique. Une route qui engage de la
 * dépense n'a rien à faire en accès libre.
 */

const service = require('./service');

module.exports = {
  register() {},
  bootstrap() {},

  routes: {
    admin: {
      type: 'admin',
      routes: [
        {
          method: 'GET',
          path: '/status/:uid/:documentId',
          handler: 'translation.status',
          config: { policies: [] },
        },
        {
          method: 'POST',
          path: '/run/:uid/:documentId',
          handler: 'translation.run',
          config: { policies: [] },
        },
      ],
    },
  },

  controllers: {
    translation: {
      async status(ctx) {
        const { uid, documentId } = ctx.params;
        try {
          ctx.body = await strapi.plugin('translation').service('translation').status({ uid, documentId });
        } catch (error) {
          ctx.throw(400, error.message);
        }
      },

      async run(ctx) {
        const { uid, documentId } = ctx.params;
        const locales = Array.isArray(ctx.request.body?.locales) ? ctx.request.body.locales : undefined;
        try {
          ctx.body = await strapi.plugin('translation').service('translation').run({ uid, documentId, locales });
        } catch (error) {
          ctx.throw(400, error.message);
        }
      },
    },
  },

  services: { translation: service },
};
