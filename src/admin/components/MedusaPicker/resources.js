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
};

/** `global::medusa-products` → définition du champ. */
export function fieldConfig(customField) {
  const name = String(customField || '').split('::').pop();
  return FIELDS[name] ?? null;
}
