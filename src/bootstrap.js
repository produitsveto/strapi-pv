'use strict';

/**
 * Bootstrap — Labels FR + configuration des vues liste/edit
 *
 * Les configurations du content-manager sont créées en base au premier accès
 * admin. Ce bootstrap les patche à chaque démarrage : labels FR, colonnes
 * de liste, mainField, tri par défaut, champs en lecture seule (readOnlyFields).
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
      shortDescription: 'Description courte',
      description: 'Description',
      faqs: 'FAQ',
      parentSpecies: 'Espèce parente',
      childSpecies: 'Sous-espèces',
      categories: 'Catégories',
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
      logo: 'Logo',
      shortDescription: 'Description courte',
      description: 'Description',
      faqs: 'FAQ',
      categories: 'Catégories',
      species: 'Espèces',
      articles: 'Articles',
      seo: 'SEO',
    },
  },
  'api::category.category': {
    settings: { mainField: 'name', defaultSortBy: 'name', defaultSortOrder: 'ASC' },
    listColumns: ['name', 'slug', 'visibilite', 'createdAt'],
    labels: {
      name: 'Nom',
      slug: 'Slug',
      visibilite: 'Visibilité',
      shortDescription: 'Description courte',
      description: 'Description',
      faqs: 'FAQ',
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
      shortDescription: 'Description courte',
      carousel: 'Carrousel',
      extendedDescription: 'Description étendue',
      modeEmploi: "Mode d'emploi",
      precautions: 'Précautions',
      notice: 'Notice (PDF)',
      formeGalenique: 'Forme galénique',
      synonymes: 'Synonymes (séparés par des virgules)',
      faqs: 'FAQ',
      laboratory: 'Laboratoire',
      species: 'Espèces',
      articles: 'Articles',
      seo: 'SEO',
    },
    // Champs importés/synchronisés par le job nocturne sync-products (Woo→Medusa→Strapi)
    // — un edit manuel serait écrasé au run suivant, jamais modifiés depuis Strapi.
    readOnlyFields: ['medusaId', 'laboratory'],
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
      relatedArticles: 'Articles liés',
      blocks: 'Contenu',
      seo: 'SEO',
    },
    // Identifiants d'import WordPress — édition = risque de casser le lien avec l'article source.
    readOnlyFields: ['wpId', 'wpStatus', 'wpModified', 'wpDate'],
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

    // --- Champs en lecture seule (édition désactivée dans le content-manager) ---
    if (ctConfig.readOnlyFields) {
      for (const field of ctConfig.readOnlyFields) {
        const meta = config.metadatas[field];
        if (!meta || !meta.edit) continue;
        if (meta.edit.editable !== false) {
          meta.edit.editable = false;
          changed = true;
        }
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
