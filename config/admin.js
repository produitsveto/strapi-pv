module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    sessions: {
      // Défaut Strapi = 30 min : trop court pour une session d'édition de fiche produit
      // (le token expire en silence, ex. PV-139 401 intermittent sur /upload/files).
      accessTokenLifespan: env.int('ADMIN_ACCESS_TOKEN_LIFESPAN', 60 * 60 * 2),
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
