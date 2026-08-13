'use strict';

/**
 * Public read-only endpoint exposing the Medusa public config to the admin bundle.
 * The browser bundle on Strapi Cloud cannot read custom STRAPI_ADMIN_* env vars at
 * build time (Cloud uses an allowlist), so the deal-picker custom field fetches
 * this route at mount instead.
 *
 * Values returned are public by design:
 *  - url: the public Medusa Store API URL
 *  - publishableKey: the Medusa publishable API key for the Deals sales channel
 *  - locales: the site's language codes, for the campaign language picker (PV-188).
 *    Read from the i18n plugin so the list never has to be maintained twice — the
 *    admin API route requires a session, this one doesn't.
 */
module.exports = {
  async show(ctx) {
    let locales = [];
    try {
      const rows = await strapi.plugin('i18n').service('locales').find();
      // Le storefront ne connaît que des codes à deux lettres : « nl-NL » et « nl »
      // coexistent côté Strapi et désignent la même version du site.
      locales = [...new Set((rows ?? []).map((l) => String(l.code).split('-')[0].toLowerCase()))].sort();
    } catch {
      locales = [];
    }

    ctx.body = {
      url: process.env.STRAPI_ADMIN_MEDUSA_URL || process.env.MEDUSA_URL || '',
      publishableKey:
        process.env.STRAPI_ADMIN_MEDUSA_PUBLISHABLE_KEY ||
        process.env.MEDUSA_PUBLISHABLE_KEY ||
        '',
      locales,
    };
  },
};
