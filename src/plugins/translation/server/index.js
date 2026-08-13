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

/**
 * Emplacement de la disposition d'un formulaire.
 *
 * Le store préfixe lui-même la clé avec le type et le nom : la clé complète en
 * base est `plugin_content_manager_configuration_content_types::<uid>`.
 */
const configStore = (strapi) => strapi.store({ type: 'plugin', name: 'content_manager' });
const configKey = (uid) => `configuration_content_types::${uid}`;

/**
 * Retire `translationMeta` des formulaires d'édition.
 *
 * Marquer le champ `visible: false` au schéma ne suffit pas : Strapi n'applique
 * cette option qu'à la création de la disposition. Sur les contenus qui
 * existaient déjà, la disposition enregistrée en base a gagné, et le champ
 * s'affichait comme un bloc JSON incompréhensible au milieu du formulaire.
 *
 * On ne retire que ce champ, en laissant le reste de la disposition intact :
 * l'ordre des champs et les libellés sont du réglage utilisateur.
 */
async function hideTechnicalField({ strapi }) {
  for (const [uid, model] of Object.entries(strapi.contentTypes)) {
    if (!model.attributes?.translationMeta) continue;

    const key = configKey(uid);
    const config = await configStore(strapi).get({ key });
    if (!config?.layouts?.edit) continue;

    const edit = config.layouts.edit
      .map((row) => row.filter((field) => field.name !== 'translationMeta'))
      .filter((row) => row.length > 0);

    const unchanged = JSON.stringify(edit) === JSON.stringify(config.layouts.edit);
    if (unchanged) continue;

    await configStore(strapi).set({ key, value: { ...config, layouts: { ...config.layouts, edit } } });
  }
}

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    try {
      await hideTechnicalField({ strapi });
    } catch (error) {
      // Un formulaire un peu encombré ne justifie pas d'empêcher Strapi de démarrer.
      strapi.log.warn(`[traduction] disposition non ajustée : ${error.message}`);
    }
  },

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
