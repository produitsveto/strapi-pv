'use strict';

/**
 * Revalidation du cache des storefronts (Deals, produits-veto.com, staging…)
 * sur publication de contenu Strapi.
 *
 * Chaque storefront (Nuxt sur Cloudflare Workers) met le contenu CMS en cache
 * dans le KV Cloudflare (12 h pour la plupart des pages, cf. PV-97). Sans purge,
 * une modif publiée dans Strapi n'apparaît qu'à l'expiration du cache.
 *
 * Ce middleware Document Service appelle l'endpoint `/api/revalidate` de CHAQUE
 * front configuré dès qu'un contenu devient (in)visible : `publish` /
 * `unpublish` / `delete`. Tous les content-types ici sont en draft & publish et
 * les fronts ne lisent que le publié → inutile de purger sur un simple
 * `update`/`create` de brouillon (ça spammerait pendant l'édition).
 *
 * Config (env) — deux formes, au choix :
 *
 *   1. Plusieurs fronts (recommandé) — un JSON array :
 *      STOREFRONT_REVALIDATE_TARGETS=[
 *        {"name":"deals","url":"https://deals.produits-veto.com/api/revalidate","secret":"…"},
 *        {"name":"pv","url":"https://produits-veto.com/api/revalidate","secret":"…"}
 *      ]
 *
 *   2. Un seul front (raccourci) :
 *      STOREFRONT_REVALIDATE_URL=https://deals.produits-veto.com/api/revalidate
 *      STOREFRONT_REVALIDATE_SECRET=…   (doit matcher NUXT_STOREFRONT_WEBHOOK_SECRET du front)
 *
 * Les deux formes se cumulent. Aucune cible valide → middleware no-op (utile en
 * dev local sans front déployé).
 */

const TRIGGER_ACTIONS = new Set(['publish', 'unpublish', 'delete']);

/**
 * Content-types dont un simple `update` doit AUSSI purger (PV-187).
 *
 * La règle générale — ne purger que sur publish/unpublish/delete — tient parce que les fronts ne
 * lisent que le publié : modifier un brouillon d'article n'a aucun effet visible, et purger à
 * chaque frappe spammerait pendant l'édition.
 *
 * Les redirections échappent à ce raisonnement : le geste courant y est de MODIFIER une règle
 * déjà publiée — corriger une destination, décocher « Activée ». Sans cette exception, la
 * correction ne prendrait effet qu'à l'expiration du cache, soit jusqu'à une heure plus tard.
 * Personne ne comprendrait pourquoi sa redirection « ne marche pas ».
 */
const UPDATE_ALSO_PURGES = new Set(['api::redirect.redirect']);

// Coalesce les purges : une publication en masse (plusieurs entrées d'affilée)
// ne déclenche qu'un seul purge ~1,5 s après la dernière, vers tous les fronts.
const DEBOUNCE_MS = 1500;

/**
 * Construit la liste des fronts à purger depuis les variables d'env.
 * Tolérant : ignore les entrées invalides en les loggant.
 */
function resolveTargets(strapi) {
  const targets = [];
  const seen = new Set();

  const add = (name, url, secret, source) => {
    if (!url || !secret) {
      strapi.log.warn(`[revalidate] cible "${name}" ignorée (${source}) : url ou secret manquant`);
      return;
    }
    if (seen.has(url)) return; // dédoublonne par URL
    seen.add(url);
    targets.push({ name: name || url, url, secret });
  };

  // Forme 1 — JSON array multi-fronts
  const raw = process.env.STOREFRONT_REVALIDATE_TARGETS;
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('attendu un tableau JSON');
      parsed.forEach((t, i) =>
        add(t.name || `target[${i}]`, t.url, t.secret, 'STOREFRONT_REVALIDATE_TARGETS'),
      );
    } catch (err) {
      strapi.log.error(`[revalidate] STOREFRONT_REVALIDATE_TARGETS illisible : ${err.message}`);
    }
  }

  // Forme 2 — couple URL/SECRET unique (raccourci, cumulable)
  add(
    'default',
    process.env.STOREFRONT_REVALIDATE_URL,
    process.env.STOREFRONT_REVALIDATE_SECRET,
    'STOREFRONT_REVALIDATE_URL/_SECRET',
  );

  return targets;
}

function registerStorefrontRevalidation({ strapi }) {
  const targets = resolveTargets(strapi);

  if (targets.length === 0) {
    strapi.log.info(
      '[revalidate] aucune cible configurée → purge du cache storefront désactivée',
    );
    return;
  }

  let timer = null;
  let pending = new Set();

  async function purgeOne(target, reasons) {
    const { url, secret, name } = target;
    const href = `${url}${url.includes('?') ? '&' : '?'}secret=${encodeURIComponent(secret)}`;
    try {
      const res = await fetch(href, { method: 'POST' });
      if (!res.ok) {
        strapi.log.warn(`[revalidate] ${name} : HTTP ${res.status} (${reasons.join(', ')})`);
        return;
      }
      const body = await res.json().catch(() => ({}));
      strapi.log.info(`[revalidate] ${name} : cache purgé (${body.purged ?? '?'} clés)`);
    } catch (err) {
      strapi.log.warn(`[revalidate] ${name} : échec purge (${err.message})`);
    }
  }

  async function flush() {
    timer = null;
    const reasons = Array.from(pending);
    pending = new Set();
    strapi.log.info(`[revalidate] purge ${targets.length} front(s) — ${reasons.join(', ')}`);
    await Promise.allSettled(targets.map((t) => purgeOne(t, reasons)));
  }

  function schedule(reason) {
    pending.add(reason);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      // ne pas faire échouer le cycle si la promesse rejette
      flush().catch(() => {});
    }, DEBOUNCE_MS);
    // ne bloque pas l'arrêt du process
    if (timer.unref) timer.unref();
  }

  strapi.documents.use(async (context, next) => {
    const result = await next();

    const isTrigger =
      TRIGGER_ACTIONS.has(context.action) ||
      (context.action === 'update' && UPDATE_ALSO_PURGES.has(context.uid));
    if (context.uid?.startsWith('api::') && isTrigger) {
      schedule(`${context.action} ${context.uid}`);
    }

    return result;
  });

  strapi.log.info(
    `[revalidate] purge activée (publish/unpublish/delete, + update sur ${[...UPDATE_ALSO_PURGES].join(', ')}) → ${targets.map((t) => t.name).join(', ')}`,
  );
}

module.exports = { registerStorefrontRevalidation };
