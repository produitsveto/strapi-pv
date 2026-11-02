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
          // PV-378 — les descriptions importées de WooCommerce citent des images hébergées ailleurs
          // (ancien stockage Google de WordPress, /wp-content de www, sites des labos) : limitées à
          // R2, elles restaient invisibles dans CKEditor alors que le site les affiche.
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          // PV-378 — aperçu des vidéos YouTube insérées dans CKEditor.
          'frame-src': ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
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
