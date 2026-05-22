'use strict';

/**
 * Public read-only endpoint exposing the Medusa public config to the admin bundle.
 * The browser bundle on Strapi Cloud cannot read custom STRAPI_ADMIN_* env vars at
 * build time (Cloud uses an allowlist), so the deal-picker custom field fetches
 * this route at mount instead.
 *
 * Both values returned are public by design:
 *  - url: the public Medusa Store API URL
 *  - publishableKey: the Medusa publishable API key for the Deals sales channel
 */
module.exports = {
  async show(ctx) {
    ctx.body = {
      url: process.env.STRAPI_ADMIN_MEDUSA_URL || process.env.MEDUSA_URL || '',
      publishableKey:
        process.env.STRAPI_ADMIN_MEDUSA_PUBLISHABLE_KEY ||
        process.env.MEDUSA_PUBLISHABLE_KEY ||
        '',
    };
  },
};
