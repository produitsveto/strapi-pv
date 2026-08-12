'use strict';

/**
 * Routes de maintenance des médias (PV-185).
 *
 * `auth: false` : ces routes ne sont pas ouvertes pour autant — elles exigent le secret
 * `MEDIA_MAINTENANCE_SECRET` en paramètre. Passer par un token API obligerait à lui accorder des
 * droits sur la médiathèque, plus larges que ce qu'une opération de maintenance ponctuelle demande.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/media-maintenance/buffers',
      handler: 'media-maintenance.status',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/media-maintenance/buffers',
      handler: 'media-maintenance.purge',
      config: { auth: false },
    },
  ],
};
