'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/medusa-config',
      handler: 'medusa-config.show',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
