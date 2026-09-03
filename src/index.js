'use strict';
const bootstrap = require("./bootstrap");
const { registerStorefrontRevalidation } = require("./revalidate-storefront");
const { registerMediaBufferStripping } = require("./strip-media-buffers");
const { hideTranslationMeta } = require("./hide-translation-meta");

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Register the deal-ref custom field (used by deals.hero-product to pick
    // a Medusa deal_reference by ID via the Medusa Store API).
    strapi.customFields.register({
      name: 'deal-ref',
      type: 'string',
    });

    // PV-188 — sélecteurs Medusa des campagnes marketing (produits, marques, catégories).
    // Le type sous-jacent reste celui d'origine du champ : les campagnes déjà enregistrées
    // restent lisibles telles quelles, aucune reprise de données.
    for (const [name, type] of [
      ['medusa-brand', 'string'],
      ['medusa-brands', 'json'],
      ['medusa-products', 'json'],
      ['medusa-targets', 'json'],
      ['medusa-countries', 'json'],
      ['pv-locales', 'json'],
    ]) {
      strapi.customFields.register({ name, type });
    }

    // Purge le cache du storefront Deals à chaque publish/unpublish/delete,
    // pour que le contenu mis à jour dans Strapi soit visible immédiatement.
    registerStorefrontRevalidation({ strapi });

    // PV-185 — empêche le provider R2 d'écrire le binaire des images en base.
    registerMediaBufferStripping({ strapi });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap(ctx) {
    await bootstrap(ctx);

    // PV-60 — `translationMeta` porte les empreintes qui protègent les corrections
    // manuelles ; il n'a pas à encombrer les formulaires. Le nettoyage vivait dans
    // le plugin « Traduction », retiré au profit de la seule passe nocturne.
    try {
      await hideTranslationMeta(ctx);
    } catch (error) {
      // Un formulaire un peu encombré ne justifie pas d'empêcher Strapi de démarrer.
      ctx.strapi.log.warn(`[traduction] disposition non ajustée : ${error.message}`);
    }
  },
};
