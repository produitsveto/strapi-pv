'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::site-identity.site-identity');
