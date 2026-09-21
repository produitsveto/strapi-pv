module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  // PV-255 — tâche des articles programmés (src/scheduled-articles.js).
  cron: {
    enabled: true,
  },
  // Serveur MCP natif (Strapi ≥ 5.47) : expose le contenu et la médiathèque sur
  // POST /mcp, authentifié par un admin token. Éteint par défaut — on l'allume
  // là où on en a besoin, sans changer le comportement de la prod.
  mcp: {
    enabled: env.bool('STRAPI_MCP_ENABLED', false),
  },
});
