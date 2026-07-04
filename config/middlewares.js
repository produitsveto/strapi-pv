module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https://*.r2.dev', 'https://media.produits-veto.com', 'https://*.cloudflareinsights.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'https://*.r2.dev', 'https://media.produits-veto.com'],
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '50mb',
      formLimit: '50mb',
      textLimit: '50mb',
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
