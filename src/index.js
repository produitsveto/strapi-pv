'use strict';
const bootstrap = require("./bootstrap");
const { registerStorefrontRevalidation } = require("./revalidate-storefront");
const { registerMediaBufferStripping } = require("./strip-media-buffers");

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
  bootstrap,
};
