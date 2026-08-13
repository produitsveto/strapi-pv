/**
 * PV-188 — sources de données des sélecteurs Medusa des campagnes marketing.
 *
 * Les produits, marques et catégories vivent dans Medusa : Strapi ne peut pas en faire des
 * relations natives, on stocke donc leur `handle`. Ces définitions disent, pour chaque champ,
 * où chercher les valeurs et comment les présenter à l'utilisateur.
 */

/** Un seul appel de config Medusa pour tout l'onglet admin (cf. DealPicker). */
let configPromise = null;
export function getMedusaConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/medusa-config', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { url: '', publishableKey: '' }))
      .catch(() => ({ url: '', publishableKey: '' }));
  }
  return configPromise;
}

async function medusaFetch(path, params) {
  const { url, publishableKey } = await getMedusaConfig();
  if (!url) throw new Error('URL Medusa non configurée');
  const qs = new URLSearchParams(params);
  const res = await fetch(`${url}/store/${path}?${qs.toString()}`, {
    headers: publishableKey ? { 'x-publishable-api-key': publishableKey } : {},
  });
  if (!res.ok) throw new Error(`Medusa /store/${path} → ${res.status}`);
  return res.json();
}

/**
 * `search(query)` renvoie [{ value, label }] ; `resolve(handles)` fait de même pour des valeurs
 * déjà enregistrées, afin d'afficher un nom lisible plutôt qu'un identifiant technique.
 */
export const RESOURCES = {
  products: {
    placeholder: 'Rechercher un produit…',
    empty: 'Aucun produit trouvé',
    async search(query) {
      const { products } = await medusaFetch('products', {
        limit: '30',
        fields: 'handle,title',
        ...(query ? { q: query } : {}),
      });
      return (products ?? []).map((p) => ({ value: p.handle, label: p.title || p.handle }));
    },
    async resolve(handles) {
      if (!handles.length) return [];
      const { products } = await medusaFetch('products', {
        limit: String(handles.length),
        fields: 'handle,title',
        ...handles.reduce((acc, h, i) => ({ ...acc, [`handle[${i}]`]: h }), {}),
      });
      return (products ?? []).map((p) => ({ value: p.handle, label: p.title || p.handle }));
    },
  },

  brands: {
    placeholder: 'Rechercher une marque…',
    empty: 'Aucune marque trouvée',
    async search(query) {
      // Le module brand n'expose pas de recherche serveur : on charge la liste (~110 marques)
      // une fois et on filtre côté navigateur.
      const { brands } = await medusaFetch('brands', { limit: '500' });
      const all = (brands ?? []).map((b) => ({ value: b.handle, label: b.name || b.handle }));
      if (!query) return all.slice(0, 50);
      const q = query.toLowerCase();
      return all.filter((b) => b.label.toLowerCase().includes(q) || b.value.includes(q)).slice(0, 50);
    },
    async resolve(handles) {
      const { brands } = await medusaFetch('brands', { limit: '500' });
      const byHandle = new Map((brands ?? []).map((b) => [b.handle, b.name || b.handle]));
      return handles.map((h) => ({ value: h, label: byHandle.get(h) || h }));
    },
  },

  // Les pays ouverts à la vente viennent des régions Medusa : inutile d'entretenir une liste
  // en double, et un pays qu'on n'affiche pas est un pays qu'on ne peut pas viser par erreur.
  countries: {
    placeholder: 'Rechercher un pays…',
    empty: 'Aucun pays trouvé',
    async all() {
      const { regions } = await medusaFetch('regions', { limit: '50' });
      const noms = new Intl.DisplayNames(['fr'], { type: 'region' });
      const seen = new Map();
      for (const r of regions ?? []) {
        for (const c of r.countries ?? []) {
          const code = String(c.iso_2 || '').toLowerCase();
          if (!code || seen.has(code)) continue;
          let label = code.toUpperCase();
          try {
            label = noms.of(code.toUpperCase()) || label;
          }
          catch { /* code inconnu du navigateur : on garde le code */ }
          seen.set(code, { value: code, label });
        }
      }
      return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    },
    async search(query) {
      const all = await this.all();
      if (!query) return all;
      const q = query.toLowerCase();
      return all.filter(c => c.label.toLowerCase().includes(q) || c.value.includes(q));
    },
    async resolve(codes) {
      const all = await this.all();
      const byCode = new Map(all.map(c => [c.value, c.label]));
      return codes.map(c => ({ value: c, label: byCode.get(String(c).toLowerCase()) || c }));
    },
  },

  // Les langues ne viennent pas de Medusa mais des versions du site, exposées par
  // /api/medusa-config : le site en compte neuf, et la liste évoluera sans qu'on ait
  // à la recopier ici.
  locales: {
    placeholder: 'Choisir une langue…',
    empty: 'Aucune langue',
    async all() {
      const { locales } = await getMedusaConfig();
      const noms = new Intl.DisplayNames(['fr'], { type: 'language' });
      return (locales ?? []).map((code) => {
        let label = code.toUpperCase();
        try {
          const n = noms.of(code);
          if (n && n !== code) label = n.charAt(0).toUpperCase() + n.slice(1);
        }
        catch { /* code inconnu du navigateur : on garde le code */ }
        return { value: code, label };
      }).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    },
    async search(query) {
      const all = await this.all();
      if (!query) return all;
      const q = query.toLowerCase();
      return all.filter(l => l.label.toLowerCase().includes(q) || l.value.includes(q));
    },
    async resolve(codes) {
      const all = await this.all();
      const byCode = new Map(all.map(l => [l.value, l.label]));
      return codes.map(c => ({ value: c, label: byCode.get(String(c).toLowerCase()) || c }));
    },
  },

  categories: {
    placeholder: 'Rechercher une catégorie…',
    empty: 'Aucune catégorie trouvée',
    async search(query) {
      const { product_categories: cats } = await medusaFetch('product-categories', {
        limit: '30',
        fields: 'handle,name',
        ...(query ? { q: query } : {}),
      });
      return (cats ?? []).map((c) => ({ value: c.handle, label: c.name || c.handle }));
    },
    async resolve(handles) {
      if (!handles.length) return [];
      const { product_categories: cats } = await medusaFetch('product-categories', {
        limit: String(handles.length),
        fields: 'handle,name',
        ...handles.reduce((acc, h, i) => ({ ...acc, [`handle[${i}]`]: h }), {}),
      });
      const byHandle = new Map((cats ?? []).map((c) => [c.handle, c.name || c.handle]));
      return handles.map((h) => ({ value: h, label: byHandle.get(h) || h }));
    },
  },
};

/**
 * Les champs sont branchés sur ces définitions par le nom du custom field. `creatable` autorise
 * une valeur hors liste : `target_handles` sert aussi à viser des familles de méga-menu, qui ne
 * sont pas des catégories Medusa (PV-152).
 */
export const FIELDS = {
  'medusa-brand': { resource: 'brands', multiple: false },
  'medusa-brands': { resource: 'brands', multiple: true },
  'medusa-products': { resource: 'products', multiple: true },
  'medusa-targets': { resource: 'categories', multiple: true, creatable: true },
  'medusa-countries': { resource: 'countries', multiple: true },
  'pv-locales': { resource: 'locales', multiple: true },
};

/** `global::medusa-products` → définition du champ. */
export function fieldConfig(customField) {
  const name = String(customField || '').split('::').pop();
  return FIELDS[name] ?? null;
}
