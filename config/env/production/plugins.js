module.exports = ({ env }) => {
  // Cloudflare R2 media storage is only used when its credentials are configured
  // (production). Environments without R2 creds (e.g. self-hosted staging) fall
  // back to Strapi's default local upload provider (public/uploads). Existing
  // media keeps loading from R2 since those URLs are stored absolute in the DB;
  // only new uploads differ.
  const hasR2 = Boolean(env('CF_R2_ACCOUNT_ID'));

  if (!hasR2) {
    return {
      'cloudflare-r2-assets': { enabled: false },
    };
  }

  return {
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
  };
};
