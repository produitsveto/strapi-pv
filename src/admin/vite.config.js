const { mergeConfig } = require('vite');

module.exports = (config) => {
  return mergeConfig(config, {
    server: {
      allowedHosts: ['.produits-veto.com'],
    },
  });
};
