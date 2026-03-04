'use strict';

/**
 * Labels français pour les champs du content-manager.
 *
 * Les labels sont appliqués au démarrage de Strapi sur les configurations
 * du content-manager stockées en base. Au premier lancement, les configs
 * n'existent pas encore (créées au premier accès admin) — il suffit de
 * redémarrer Strapi une fois après le premier accès pour que les labels
 * soient appliqués.
 */

const FIELD_LABELS = {
  'api::species.species': {
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
  'api::breed.breed': {
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
  'api::laboratory.laboratory': {
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
  'api::category.category': {
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
  'api::product.product': {
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
  'api::article.article': {
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
  'api::deals-homepage.deals-homepage': {
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
  'api::deals-product-page.deals-product-page': {
    topBanner: 'Bannière haute',
    trustBadges: 'Badges de confiance',
    whyThisPriceTitle: 'Titre pourquoi ce prix',
    whyThisPriceItems: 'Éléments pourquoi ce prix',
    genericFaqs: 'FAQ génériques',
    crossSellTitle: 'Titre ventes croisées',
    relatedProductsTitle: 'Titre produits similaires',
    seo: 'SEO',
  },
};

async function applyFrenchLabels() {
  const cmStore = strapi.store({ type: 'plugin', name: 'content_manager' });

  for (const [uid, labels] of Object.entries(FIELD_LABELS)) {
    const storeKey = `configuration_content_types::${uid}`;

    let config;
    try {
      config = await cmStore.get({ key: storeKey });
    } catch {
      continue;
    }

    if (!config || !config.metadatas) continue;

    let changed = false;
    for (const [field, label] of Object.entries(labels)) {
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
      strapi.log.info(`[bootstrap] Labels FR appliqués pour ${uid}`);
    }
  }
}

module.exports = async () => {
  await applyFrenchLabels();
};
