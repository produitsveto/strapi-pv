'use strict';

/**
 * Bootstrap — Labels FR + configuration des vues liste/edit
 *
 * Les configurations du content-manager sont créées en base au premier accès
 * admin. Ce bootstrap les patche à chaque démarrage : labels FR, colonnes
 * de liste, mainField, tri par défaut.
 *
 * → Premier lancement : les configs n'existent pas encore, rien ne se passe.
 * → Redémarrer Strapi après le premier accès admin pour appliquer.
 */

const CONTENT_TYPE_CONFIG = {
  'api::species.species': {
    settings: { mainField: 'name', defaultSortBy: 'name', defaultSortOrder: 'ASC' },
    listColumns: ['name', 'slug', 'visibilite', 'categories', 'createdAt'],
    labels: {
      name: 'Nom',
      slug: 'Slug',
      visibilite: 'Visibilité',
      mainImage: 'Image principale',
      description: 'Description',
      faqs: 'FAQ',
      marketingBanner: 'Bannière marketing',
      featuredProducts: 'Produits mis en avant',
      parentSpecies: 'Espèce parente',
      childSpecies: 'Sous-espèces',
      categories: 'Catégories',
      laboratories: 'Laboratoires',
      articles: 'Articles',
      seo: 'SEO',
    },
  },
  'api::breed.breed': {
    settings: { mainField: 'name', defaultSortBy: 'name', defaultSortOrder: 'ASC' },
    listColumns: ['name', 'slug', 'parentSpecies', 'visibilite', 'createdAt'],
    labels: {
      name: 'Nom',
      slug: 'Slug',
      visibilite: 'Visibilité',
      mainImage: 'Image principale',
      description: 'Description',
      faqs: 'FAQ',
      marketingBanner: 'Bannière marketing',
      featuredProducts: 'Produits mis en avant',
      parentSpecies: 'Espèce parente',
      laboratories: 'Laboratoires',
      articles: 'Articles',
      seo: 'SEO',
    },
  },
  'api::laboratory.laboratory': {
    settings: { mainField: 'name', defaultSortBy: 'name', defaultSortOrder: 'ASC' },
    listColumns: ['name', 'slug', 'visibilite', 'categories', 'createdAt'],
    labels: {
      name: 'Nom',
      slug: 'Slug',
      visibilite: 'Visibilité',
      mainImage: 'Image principale',
      logo: 'Logo',
      description: 'Description',
      faqs: 'FAQ',
      marketingBanner: 'Bannière marketing',
      featuredProducts: 'Produits mis en avant',
      categories: 'Catégories',
      species: 'Espèces',
      breeds: 'Races',
      alliedLaboratory: 'Laboratoire allié',
      articles: 'Articles',
      seo: 'SEO',
    },
  },
  'api::category.category': {
    settings: { mainField: 'name', defaultSortBy: 'name', defaultSortOrder: 'ASC' },
    listColumns: ['name', 'slug', 'parentCategory', 'visibilite', 'createdAt'],
    labels: {
      name: 'Nom',
      slug: 'Slug',
      visibilite: 'Visibilité',
      mainImage: 'Image principale',
      description: 'Description',
      marketingBanner: 'Bannière marketing',
      featuredProducts: 'Produits mis en avant',
      googleCategory: 'Catégorie Google',
      parentCategory: 'Catégorie parente',
      childCategories: 'Sous-catégories',
      articles: 'Articles',
      species: 'Espèces',
      laboratories: 'Laboratoires',
      seo: 'SEO',
    },
  },
  'api::product.product': {
    settings: { mainField: 'name', defaultSortBy: 'name', defaultSortOrder: 'ASC' },
    listColumns: ['name', 'ean', 'handle', 'laboratory', 'visibilite', 'createdAt'],
    labels: {
      name: 'Nom',
      ean: 'EAN',
      medusaId: 'ID Medusa',
      handle: 'Handle',
      visibilite: 'Visibilité',
      mainImage: 'Image principale',
      carousel: 'Carrousel',
      extendedDescription: 'Description étendue',
      modeEmploi: "Mode d'emploi",
      precautions: 'Précautions',
      notice: 'Notice (PDF)',
      formeGalenique: 'Forme galénique',
      synonymes: 'Synonymes',
      faqs: 'FAQ',
      laboratory: 'Laboratoire',
      species: 'Espèces',
      breeds: 'Races',
      articles: 'Articles',
      seo: 'SEO',
    },
  },
  'api::article.article': {
    settings: { mainField: 'title', defaultSortBy: 'createdAt', defaultSortOrder: 'DESC' },
    listColumns: ['title', 'slug', 'categories', 'createdAt'],
    labels: {
      title: 'Titre',
      description: 'Description',
      slug: 'Slug',
      cover: 'Couverture',
      categories: 'Catégories',
      species: 'Espèces',
      breeds: 'Races',
      laboratories: 'Laboratoires',
      relatedArticles: 'Articles liés',
      body: 'Contenu',
      seo: 'SEO',
    },
  },
  'api::deals-homepage.deals-homepage': {
    settings: {},
    listColumns: [],
    labels: {
      heroTitle: 'Titre hero',
      heroDescription: 'Description hero',
      heroProducts: 'Produits hero',
      trustBadges: 'Badges de confiance',
      newProductsTitle: 'Titre nouveautés',
      quickFilters: 'Filtres rapides',
      brands: 'Marques',
      discountBadges: 'Badges promo',
      presentationTitle: 'Titre présentation',
      presentationBody: 'Corps présentation',
      stayConnectedTitle: 'Titre restez connecté',
      stayConnectedBody: 'Corps restez connecté',
      seo: 'SEO',
    },
  },
  'api::deals-product-page.deals-product-page': {
    settings: {},
    listColumns: [],
    labels: {
      topBanner: 'Bannière haute',
      trustBadges: 'Badges de confiance',
      whyThisPriceTitle: 'Titre pourquoi ce prix',
      whyThisPriceItems: 'Éléments pourquoi ce prix',
      genericFaqs: 'FAQ génériques',
      crossSellTitle: 'Titre ventes croisées',
      relatedProductsTitle: 'Titre produits similaires',
      seo: 'SEO',
    },
  },
  'api::site-identity.site-identity': {
    settings: {},
    listColumns: [],
    labels: {
      legalName: 'Raison sociale',
      logo: 'Logo',
      email: 'Email contact',
      phone: 'Téléphone',
      address: 'Adresse',
      socialLinks: 'Réseaux sociaux',
      foundingDate: 'Date de création',
      founders: 'Fondateurs',
      pharmacists: 'Pharmaciens',
      knowsAbout: "Domaines d'expertise",
      vatId: 'Numéro TVA',
      siret: 'SIRET',
    },
  },
};

async function applyContentManagerConfig() {
  const cmStore = strapi.store({ type: 'plugin', name: 'content_manager' });

  for (const [uid, ctConfig] of Object.entries(CONTENT_TYPE_CONFIG)) {
    const storeKey = `configuration_content_types::${uid}`;

    let config;
    try {
      config = await cmStore.get({ key: storeKey });
    } catch {
      continue;
    }

    if (!config || !config.metadatas) continue;

    let changed = false;

    // --- Settings (mainField, tri) ---
    if (ctConfig.settings && Object.keys(ctConfig.settings).length > 0) {
      for (const [key, value] of Object.entries(ctConfig.settings)) {
        if (config.settings[key] !== value) {
          config.settings[key] = value;
          changed = true;
        }
      }
    }

    // --- Colonnes de liste ---
    if (ctConfig.listColumns && ctConfig.listColumns.length > 0) {
      const currentList = JSON.stringify(config.layouts?.list);
      const targetList = JSON.stringify(ctConfig.listColumns);
      if (currentList !== targetList) {
        config.layouts.list = ctConfig.listColumns;
        changed = true;
      }
    }

    // --- Labels FR ---
    for (const [field, label] of Object.entries(ctConfig.labels)) {
      const meta = config.metadatas[field];
      if (!meta) continue;

      if (meta.edit && meta.edit.label !== label) {
        meta.edit.label = label;
        changed = true;
      }
      if (meta.list && meta.list.label !== label) {
        meta.list.label = label;
        changed = true;
      }
    }

    if (changed) {
      await cmStore.set({ key: storeKey, value: config });
      strapi.log.info(`[bootstrap] Config content-manager mise à jour pour ${uid}`);
    }
  }
}

module.exports = async () => {
  await applyContentManagerConfig();
};
