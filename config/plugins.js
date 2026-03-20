module.exports = ({ env }) => {
  const isR2Enabled = !!env('CF_R2_BUCKET', '')

  return {
    // Cloudflare R2 upload provider (active when CF_R2_BUCKET is set)
    ...(isR2Enabled && {
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
    }),
  }
}
