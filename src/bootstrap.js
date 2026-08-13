'use strict';

/**
 * Bootstrap — Labels FR + configuration des vues liste/edit
 *
 * Les configurations du content-manager sont créées en base au premier accès
 * admin. Ce bootstrap les patche à chaque démarrage : labels FR, descriptions
 * d'aide, colonnes de liste, mainField, tri par défaut, ordre/largeur des champs
 * du formulaire (editLayout) et champs en lecture seule (readOnlyFields).
 *
 * S'applique aux content-types (CONTENT_TYPE_CONFIG) comme aux composants
 * (COMPONENT_CONFIG) — un composant a sa propre config de vue, c'est elle qui
 * pilote l'affichage des champs quand on déplie une entrée répétable.
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
  // PV-153 — vue « DEALS - Accueil » : les champs suivent l'ordre d'apparition
  // sur la page (bandeau → hero → sections → SEO), pas l'ordre du schéma.
  'api::deals-homepage.deals-homepage': {
    settings: {},
    listColumns: [],
    labels: {
      topBandItems: 'Bandeau haut de page',
      heroEyebrow: 'Sur-titre',
      heroTitle: 'Titre',
      heroDescription: 'Description',
      heroCtaPrimaryLabel: 'Bouton principal — libellé',
      heroCtaPrimaryLink: 'Bouton principal — lien',
      heroCtaSecondaryLabel: 'Bouton secondaire — libellé',
      heroCtaSecondaryLink: 'Bouton secondaire — lien',
      heroStats: 'Chiffres clés',
      heroProducts: 'Deals mis en avant',
      newProductsTitle: 'Titre de la section Nouveautés',
      seo: 'SEO',
    },
    descriptions: {
      topBandItems: 'Messages du bandeau vert affiché en haut de toutes les pages du site Deals (6 maximum, séparés par un point médian).',
      heroEyebrow: 'Courte accroche affichée au-dessus du titre.',
      heroTitle: 'Titre principal de la page d’accueil.',
      heroCtaPrimaryLink: 'Chemin interne, ex. /promotions — la langue est ajoutée automatiquement.',
      heroCtaSecondaryLink: 'Chemin interne, ex. /promotions — la langue est ajoutée automatiquement.',
      heroStats: 'Chiffres affichés sous les boutons (4 maximum).',
      heroProducts: 'Deals affichés dans la carte à droite du hero (6 maximum).',
      newProductsTitle: 'Titre de la section de deals située juste sous le hero.',
    },
    editLayout: [
      [{ name: 'topBandItems', size: 12 }],
      [{ name: 'heroEyebrow', size: 4 }, { name: 'heroTitle', size: 8 }],
      [{ name: 'heroDescription', size: 12 }],
      [{ name: 'heroCtaPrimaryLabel', size: 3 }, { name: 'heroCtaPrimaryLink', size: 3 }, { name: 'heroCtaSecondaryLabel', size: 3 }, { name: 'heroCtaSecondaryLink', size: 3 }],
      [{ name: 'heroStats', size: 12 }],
      [{ name: 'heroProducts', size: 12 }],
      [{ name: 'newProductsTitle', size: 12 }],
      [{ name: 'seo', size: 12 }],
    ],
  },
  'api::deals-product-page.deals-product-page': {
    settings: {},
    listColumns: [],
    labels: {
      topBanner: 'Bannière haute',
      whyThisPriceTitle: 'Titre pourquoi ce prix',
      whyThisPriceItems: 'Éléments pourquoi ce prix',
      genericFaqs: 'FAQ génériques',
      crossSellTitle: 'Titre ventes croisées',
      relatedProductsTitle: 'Titre produits similaires',
      seo: 'SEO',
    },
  },
  // PV-190 — l'accueil de produits-veto.com se limite à ce que le site lit vraiment :
  // les bannières viennent des campagnes marketing, les carrousels de Medusa.
  'api::pv-homepage.pv-homepage': {
    settings: {},
    listColumns: [],
    labels: {
      reassurance: 'Bandeau de réassurance',
      seo: 'SEO',
    },
    descriptions: {
      reassurance: 'Les 4 arguments affichés sous les carrousels de la page d’accueil (livraison, agrément, paiement, avis). Laisser vide affiche le bandeau par défaut.',
      seo: 'Titre et description de la page d’accueil dans Google.',
    },
    editLayout: [
      [{ name: 'reassurance', size: 12 }],
      [{ name: 'seo', size: 12 }],
    ],
  },
  // PV-190 — produits-veto.com a désormais sa propre fiche produit : seules les
  // « FAQ génériques » sont lues par le site, les autres champs restent pour plus tard.
  'api::pv-product-page.pv-product-page': {
    settings: {},
    listColumns: [],
    labels: {
      topBanner: 'Bannière haute',
      whyThisPriceTitle: 'Titre pourquoi ce prix',
      whyThisPriceItems: 'Éléments pourquoi ce prix',
      genericFaqs: 'FAQ génériques',
      crossSellTitle: 'Titre ventes croisées',
      relatedProductsTitle: 'Titre produits similaires',
      seo: 'SEO',
    },
    descriptions: {
      genericFaqs: 'Questions affichées au bas de toutes les fiches produit de produits-veto.com.',
    },
  },
  // PV-188 — le formulaire des campagnes affichait 28 champs en vrac, aux noms techniques et
  // sans ordre : PA le jugeait « incompréhensible ». On range par usage, on nomme en clair, et
  // PV-188 — formulaire rangé par usage et nommé en clair : PA jugeait les 28 champs d'origine
  // « incompréhensibles ». Ont été retirés du schéma au passage les six compteurs de performance
  // (c'est le rôle de l'outil d'analytics) ainsi que les appareils et canaux de vente, que le
  // site ne lit pas et que personne n'a jamais renseignés.
  // Pays ET langues sont bien appliqués par le site : ils restent dans le bloc ciblage.
  'api::marketing-campaign.marketing-campaign': {
    settings: { mainField: 'title', defaultSortBy: 'start_date', defaultSortOrder: 'DESC' },
    listColumns: ['title', 'campaign_type', 'is_active', 'start_date', 'end_date'],
    labels: {
      title: 'Nom de la campagne',
      slug: 'Identifiant',
      campaign_type: 'Type de campagne',
      start_date: 'Début',
      end_date: 'Fin',
      is_active: 'Activée',
      priority: 'Ordre d’affichage',
      banner_image: 'Visuel',
      banner_image_mobile: 'Visuel mobile',
      redirect_url: 'Lien au clic',
      background_color: 'Couleur de fond',
      label_title: 'Étiquette',
      target_handles: 'Cibles de la campagne',
      brand_handle: 'Marque / laboratoire',
      brand_handles: 'Marques mises en avant',
      product_handles: 'Produits mis en avant',
      analytics_id: 'Identifiant Google Analytics',
      campaign_tracking_id: 'Identifiant de suivi interne',
      locales: 'Langues de diffusion',
      countries: 'Pays de diffusion',
    },
    descriptions: {
      campaign_type: 'Détermine où la campagne s’affiche : bannière d’accueil, de catégorie, de marque, de méga-menu, produits en vedette, top laboratoires ou vente croisée.',
      start_date: 'La campagne apparaît automatiquement à cette date.',
      end_date: 'La campagne disparaît automatiquement après cette date.',
      is_active: 'Décocher retire la campagne du site sans la supprimer.',
      priority: 'Du plus petit au plus grand. Départage les campagnes qui visent le même emplacement.',
      banner_image: 'Format habituel : 1240 × 430 px pour l’accueil, 1240 × 460 px pour une catégorie.',
      banner_image_mobile: 'Facultatif. Visuel affiché sur téléphone à la place du grand format, illisible sur petit écran. Format conseillé : 1080 × 720 px.',
      redirect_url: 'Où mène le clic sur le visuel. Adresse complète ou chemin interne.',
      label_title: 'Petite pastille posée sur la bannière de catégorie, ex. « Promo canon ! ».',
      target_handles: 'Catégories visées. Pour une bannière de méga-menu, saisir la famille telle quelle et valider avec « Utiliser … tel quel ».',
      brand_handle: 'Marque dont la page porte la bannière (types Bannière marque et Produits en vedette d’une marque).',
      brand_handles: 'Laboratoires poussés dans la section « Top laboratoires » de l’accueil, dans l’ordre choisi.',
      product_handles: 'Produits mis en avant, dans l’ordre d’affichage.',
      analytics_id: 'Nom de la campagne remonté à Google Analytics.',
      locales: 'Limite la campagne à la version du site choisie (français, anglais). Vide = les deux. À ne pas confondre avec le pays du visiteur : un Belge peut lire le site en français.',
      countries: 'Limite la campagne aux visiteurs de ces pays. Vide = diffusée partout.',
    },
    editLayout: [
      [{ name: 'title', size: 6 }, { name: 'campaign_type', size: 6 }],
      [{ name: 'start_date', size: 4 }, { name: 'end_date', size: 4 }, { name: 'is_active', size: 2 }, { name: 'priority', size: 2 }],
      [{ name: 'banner_image', size: 6 }, { name: 'banner_image_mobile', size: 6 }],
      [{ name: 'redirect_url', size: 6 }, { name: 'label_title', size: 3 }, { name: 'background_color', size: 3 }],
      [{ name: 'target_handles', size: 12 }],
      [{ name: 'brand_handle', size: 6 }, { name: 'brand_handles', size: 6 }],
      [{ name: 'product_handles', size: 12 }],
      [{ name: 'countries', size: 6 }, { name: 'locales', size: 6 }],
      [{ name: 'analytics_id', size: 6 }, { name: 'campaign_tracking_id', size: 6 }],
      [{ name: 'slug', size: 6 }],
    ],
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

/**
 * Composants — un composant embarqué garde sa propre config de vue, indépendante
 * du content-type qui l'utilise. Sans ça les champs s'affichent en anglais brut
 * (« dealRefId », « highlightText »…) partout où le composant est réutilisé.
 */
const COMPONENT_CONFIG = {
  // PV-190 — tuiles du bandeau de réassurance de l'accueil produits-veto.com.
  'pv.reassurance-item': {
    labels: {
      title: 'Titre',
      text: 'Précision',
      icon: 'Pictogramme',
    },
    descriptions: {
      title: 'Ex. « Livraison 72-96h ».',
      text: 'Ligne affichée sous le titre, en plus petit. Ex. « Offerte dès 99 € d’achat ».',
      icon: 'Dessin affiché à gauche du titre : camion (livraison), bouclier (agrément), cadenas (paiement), étoile (avis), téléphone (conseil), cœur (soin).',
    },
    editLayout: [
      [{ name: 'icon', size: 4 }, { name: 'title', size: 8 }],
      [{ name: 'text', size: 12 }],
    ],
  },
  'shared.seo': {
    labels: {
      metaTitle: 'Titre SEO',
      metaDescription: 'Description SEO',
      shareImage: 'Image de partage',
      h1: 'Titre H1 de la page',
      noIndex: 'Exclure des moteurs de recherche',
      keyword: 'Mot-clé principal',
      canonicalUrl: 'URL canonique',
    },
    descriptions: {
      metaTitle: 'Affiché dans l’onglet du navigateur et sur Google (60 caractères environ).',
      metaDescription: 'Résumé affiché sous le titre dans les résultats Google (155 caractères environ).',
      shareImage: 'Vignette utilisée lors d’un partage sur les réseaux sociaux. Facultatif : par défaut le site reprend le visuel de la fiche (logo de la marque, photo du produit, image de la catégorie).',
      h1: 'Titre affiché en haut de la page. Vide = le nom de la fiche est utilisé.',
      noIndex: 'Coché, la page reste accessible mais n’est plus indexée par Google.',
      canonicalUrl: 'À ne renseigner que si le contenu existe en double à une autre adresse.',
    },
    editLayout: [
      [{ name: 'metaTitle', size: 6 }, { name: 'metaDescription', size: 6 }],
      [{ name: 'h1', size: 6 }, { name: 'keyword', size: 6 }],
      [{ name: 'shareImage', size: 6 }],
      [{ name: 'canonicalUrl', size: 8 }, { name: 'noIndex', size: 4 }],
    ],
  },
  'deals.top-band-item': {
    labels: { text: 'Texte', link: 'Lien' },
    descriptions: {
      link: 'Facultatif — chemin interne (ex. /promotions) ou URL complète. Vide = texte non cliquable.',
    },
    editLayout: [[{ name: 'text', size: 8 }, { name: 'link', size: 4 }]],
  },
  'deals.hero-stat': {
    labels: { value: 'Valeur', label: 'Libellé' },
    descriptions: { value: 'Ex. « -50 % », « 24 h », « 4,8/5 ».' },
    editLayout: [[{ name: 'value', size: 4 }, { name: 'label', size: 8 }]],
  },
  'deals.hero-product': {
    labels: { dealRefId: 'Deal', highlightText: 'Accroche' },
    descriptions: {
      dealRefId: 'Recherche par nom de produit dans le catalogue Deals.',
      highlightText: 'Facultatif — court texte affiché sur la carte du deal.',
    },
    editLayout: [[{ name: 'dealRefId', size: 8 }, { name: 'highlightText', size: 4 }]],
  },
  'deals.why-this-price-item': {
    labels: { icon: 'Icône', title: 'Titre', description: 'Description' },
    descriptions: { icon: 'Nom d’icône Nuxt UI, ex. i-lucide-truck.' },
    editLayout: [
      [{ name: 'icon', size: 4 }, { name: 'title', size: 8 }],
      [{ name: 'description', size: 12 }],
    ],
  },
  'deals.faq-item': {
    labels: { question: 'Question', answer: 'Réponse' },
    editLayout: [[{ name: 'question', size: 12 }], [{ name: 'answer', size: 12 }]],
  },
  'deals.faq-block': {
    labels: { title: 'Titre de la section', items: 'Questions' },
    editLayout: [[{ name: 'title', size: 12 }], [{ name: 'items', size: 12 }]],
  },
  'deals.product-carousel': {
    labels: { title: 'Titre', products: 'Produits' },
    editLayout: [[{ name: 'title', size: 12 }], [{ name: 'products', size: 12 }]],
  },
  'deals.featured-product': {
    labels: { productHandle: 'Produit (handle)', highlightText: 'Accroche' },
    editLayout: [[{ name: 'productHandle', size: 8 }, { name: 'highlightText', size: 4 }]],
  },
};

/**
 * Réordonne `layouts.edit` selon `editLayout`, en ignorant les champs absents du
 * schéma et en conservant en fin de formulaire ceux qu'on n'a pas listés — sans
 * ça, un champ ajouté au schéma plus tard disparaîtrait silencieusement du BO.
 */
function buildEditLayout(target, current, uid) {
  const known = new Set(Object.keys(current.metadatas || {}));
  const placed = new Set();
  const rows = [];

  for (const row of target) {
    const cells = [];
    for (const cell of row) {
      if (!known.has(cell.name) || placed.has(cell.name)) continue;
      placed.add(cell.name);
      cells.push(cell);
    }
    if (cells.length > 0) rows.push(cells);
  }

  const leftovers = (current.layouts?.edit || [])
    .flat()
    .filter((cell) => !placed.has(cell.name));

  if (leftovers.length > 0) {
    strapi.log.warn(
      `[bootstrap] ${uid} : champs hors editLayout, ajoutés en fin de formulaire — ${leftovers.map((c) => c.name).join(', ')}`,
    );
    for (const cell of leftovers) rows.push([cell]);
  }

  return rows;
}

async function applyConfig(cmStore, storeKey, ctConfig, uid) {
  let config;
  try {
    config = await cmStore.get({ key: storeKey });
  } catch {
    return;
  }

  if (!config || !config.metadatas) return;

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
  for (const [field, label] of Object.entries(ctConfig.labels || {})) {
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

  // --- Descriptions (texte d'aide sous le champ dans le formulaire) ---
  for (const [field, description] of Object.entries(ctConfig.descriptions || {})) {
    const meta = config.metadatas[field];
    if (!meta || !meta.edit) continue;
    if (meta.edit.description !== description) {
      meta.edit.description = description;
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

  // --- Ordre et largeur des champs du formulaire ---
  if (ctConfig.editLayout) {
    const targetEdit = buildEditLayout(ctConfig.editLayout, config, uid);
    if (JSON.stringify(config.layouts?.edit) !== JSON.stringify(targetEdit)) {
      config.layouts.edit = targetEdit;
      changed = true;
    }
  }

  if (changed) {
    await cmStore.set({ key: storeKey, value: config });
    strapi.log.info(`[bootstrap] Config content-manager mise à jour pour ${uid}`);
  }
}

async function applyContentManagerConfig() {
  const cmStore = strapi.store({ type: 'plugin', name: 'content_manager' });

  for (const [uid, ctConfig] of Object.entries(CONTENT_TYPE_CONFIG)) {
    await applyConfig(cmStore, `configuration_content_types::${uid}`, ctConfig, uid);
  }

  for (const [uid, componentConfig] of Object.entries(COMPONENT_CONFIG)) {
    await applyConfig(cmStore, `configuration_components::${uid}`, componentConfig, uid);
  }
}

module.exports = async () => {
  await applyContentManagerConfig();
};
