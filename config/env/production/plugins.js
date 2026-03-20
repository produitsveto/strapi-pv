module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-plugin-cloudflare-r2-assets',
      providerOptions: {
        basePath: 'uploads',
      },
    },
  },
  'cloudflare-r2-assets': {
    enabled: true,
  },
})
