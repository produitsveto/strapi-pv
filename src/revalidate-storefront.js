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
 * PV-228 — purge par entrée. Le corps de l'appel liste les entrées modifiées
 * (`{"changes":[{"type":"api::article.article","slug":"…"}]}`) et celles qui les
 * affichent (l'article qui cite un article modifié dans ses « articles liés »…) :
 * le front ne purge que leurs clés, dans toutes les langues. `types` reste envoyé
 * pour un front qui ne connaît que la purge par familles ; un front qui ignore le
 * corps (Deals, pour l'instant) purge tout, comme avant.
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
 * Content-types dont TOUTE écriture purge, `create` et `update` compris (PV-187).
 *
 * La règle générale — ne purger que sur publish/unpublish/delete — tient parce que les fronts ne
 * lisent que le publié : modifier un brouillon d'article n'a aucun effet visible, et purger à
 * chaque frappe spammerait pendant l'édition.
 *
 * Les redirections échappent à ce raisonnement. Les deux gestes courants y sont d'en CRÉER une
 * et d'en MODIFIER une déjà publiée (corriger une destination, décocher « Activée »).
 * ⚠️ Aucun des deux ne passe par l'action `publish` : en Strapi v5, créer une entrée directement
 * publiée déclenche `create`. Mesuré le 04/09 — une règle créée restait sans effet pendant plus
 * de deux minutes, et l'aurait été jusqu'à une heure. PA aurait conclu que ça ne marche pas.
 */
const ALWAYS_PURGE_TYPES = new Set(['api::redirect.redirect']);
const ALWAYS_PURGE_ACTIONS = new Set(['create', 'update']);

/**
 * PV-228 — une écriture par l'API REST publie directement : `PUT /api/products/:id` passe
 * `status: 'published'` au Document Service, qui publie EN INTERNE, sans repasser par ce
 * middleware. Il ne voit donc qu'un `update`, que la règle générale ignorait. La synchro Woo
 * nocturne (PV-166, PV-207), les traductions (PV-60, PV-254) et le nom synchronisé depuis Medusa
 * n'étaient ainsi jamais purgés : ils attendaient l'expiration du cache, 7 jours désormais.
 * Un enregistrement dans l'admin, lui, n'écrit que le brouillon (pas de `status`), sauf pour les
 * types sans brouillon, dont toute écriture est publique.
 */
function isPublishedWrite(strapi, context) {
  if (!ALWAYS_PURGE_ACTIONS.has(context.action)) return false;
  // Sans brouillon (auteurs, tags…), toute écriture est immédiatement visible.
  return context.params?.status === 'published' || !strapi.contentType(context.uid)?.options?.draftAndPublish;
}

// Coalesce les purges : une publication en masse (plusieurs entrées d'affilée)
// ne déclenche qu'un seul purge ~1,5 s après la dernière, vers tous les fronts.
const DEBOUNCE_MS = 1500;
// … mais une rafale continue (4 traductions en parallèle pendant une heure, PV-254) purge quand
// même toutes les 30 s, au lieu d'attendre la fin.
const MAX_WAIT_MS = 30_000;
// Seconde passe : une clé écrite juste avant la publication n'apparaît pas encore dans la liste
// des clés de Cloudflare, qui a jusqu'à une minute de retard. La même purge est relancée.
const SECOND_PASS_MS = 90_000;

/** Champ par lequel les fronts identifient une entrée dans leurs clés de cache. */
const IDENTIFIER_FIELDS = {
  'api::article.article': 'slug',
  'api::laboratory.laboratory': 'slug',
  'api::category.category': 'slug',
  'api::product.product': 'medusaId',
};

/**
 * Entrées qui AFFICHENT une entrée modifiée, et sont donc purgées avec elle :
 * - `from` + `field` : les entrées de `from` dont la relation `field` contient l'entrée modifiée ;
 * - `own` : les entrées pointées par la relation `own` de l'entrée modifiée.
 * `scope` limite la purge de ces entrées à la partie qui affiche l'entrée modifiée
 * (`detail` = leur page, `articles` = le bloc d'articles d'une fiche produit).
 * ⚠️ Les relations placées dans des composants (carrousel produits d'un article…) ne sont pas suivies.
 */
const DISPLAYED_BY = {
  'api::article.article': [
    { from: 'api::article.article', field: 'relatedArticles', scope: 'detail' },
    { from: 'api::laboratory.laboratory', field: 'articles' },
    { own: 'products', scope: 'articles' },
  ],
  'api::product.product': [
    { from: 'api::product.product', field: 'suggestedProducts', scope: 'detail' },
    { from: 'api::product.product', field: 'bundledProducts', scope: 'detail' },
    { own: 'articles', scope: 'detail' },
  ],
  'api::category.category': [{ own: 'articles', scope: 'detail' }],
  'api::author.author': [{ own: 'articles', scope: 'detail' }],
  'api::tag.tag': [{ own: 'articles', scope: 'detail' }],
  'api::species.species': [{ own: 'articles', scope: 'detail' }],
  'api::blog-category.blog-category': [{ own: 'articles', scope: 'detail' }],
};

const unique = (values) => [...new Set(values.filter(Boolean))];

/**
 * Entrées à purger pour un document : lui-même (par son identifiant) et celles qui l'affichent.
 * Lu en base, brouillon et publié confondus, toutes langues : un slug ou une relation qui vient de
 * changer est couvert par la lecture faite avant l'écriture ET par celle faite au moment de purger.
 */
async function collectChanges(strapi, uid, documentId) {
  const changes = [];
  const idField = IDENTIFIER_FIELDS[uid];
  if (idField) {
    const rows = await strapi.db.query(uid).findMany({ where: { documentId }, select: [idField] });
    // Sans identifiant, l'entrée n'a pas de page sur les fronts : rien à purger pour elle.
    for (const id of unique(rows.map((row) => row[idField]))) changes.push({ type: uid, [idField]: id });
  } else {
    changes.push({ type: uid });
  }

  for (const ref of DISPLAYED_BY[uid] ?? []) {
    if (ref.from) {
      const field = IDENTIFIER_FIELDS[ref.from];
      const rows = await strapi.db.query(ref.from).findMany({
        where: { [ref.field]: { documentId } },
        select: [field],
      });
      for (const id of unique(rows.map((row) => row[field]))) {
        changes.push({ type: ref.from, [field]: id, ...(ref.scope && { scope: ref.scope }) });
      }
    } else {
      const target = strapi.contentType(uid)?.attributes?.[ref.own]?.target;
      const field = IDENTIFIER_FIELDS[target];
      if (!field) continue;
      const rows = await strapi.db.query(uid).findMany({
        where: { documentId },
        select: ['id'],
        populate: { [ref.own]: { select: [field] } },
      });
      const ids = unique(rows.flatMap((row) => (row[ref.own] ?? []).map((linked) => linked[field])));
      for (const id of ids) changes.push({ type: target, [field]: id, ...(ref.scope && { scope: ref.scope }) });
    }
  }
  return changes;
}

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
    return null;
  }

  let timer = null;
  let firstPendingAt = null;
  let pendingReasons = new Set();
  // Documents à relire au moment de purger (état après écriture), et entrées déjà relevées avant.
  let pendingDocuments = new Map();
  let pendingChanges = new Map();

  const addChanges = (changes) => {
    for (const change of changes) pendingChanges.set(JSON.stringify(change), change);
  };

  async function purgeOne(target, label, payload) {
    const { url, secret, name } = target;
    const href = `${url}${url.includes('?') ? '&' : '?'}secret=${encodeURIComponent(secret)}`;
    try {
      const res = await fetch(href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        strapi.log.warn(`[revalidate] ${name} : HTTP ${res.status} (${label})`);
        return;
      }
      const body = await res.json().catch(() => ({}));
      strapi.log.info(`[revalidate] ${name} : cache purgé (${body.purged ?? '?'} clés${body.mode ? `, ${body.mode}` : ''}) — ${label}`);
    } catch (err) {
      strapi.log.warn(`[revalidate] ${name} : échec purge (${err.message}) — ${label}`);
    }
  }

  async function send(payload, label) {
    await Promise.allSettled(targets.map((t) => purgeOne(t, label, payload)));
  }

  async function flush() {
    timer = null;
    firstPendingAt = null;
    const reasons = Array.from(pendingReasons);
    const documents = Array.from(pendingDocuments.values());
    pendingReasons = new Set();
    pendingDocuments = new Map();

    for (const { uid, documentId } of documents) {
      try {
        addChanges(await collectChanges(strapi, uid, documentId));
      } catch (err) {
        strapi.log.warn(`[revalidate] ${uid} ${documentId} : entrées non relues (${err.message}), purge du type`);
        addChanges([{ type: uid }]);
      }
    }
    const changes = Array.from(pendingChanges.values());
    pendingChanges = new Map();
    if (changes.length === 0) {
      strapi.log.info(`[revalidate] rien à purger — ${reasons.join(', ')}`);
      return;
    }

    const payload = { changes, types: unique(changes.map((change) => change.type)) };
    const label = `${reasons.length > 3 ? `${reasons.length} écritures` : reasons.join(', ')}, ${changes.length} entrée(s)`;
    strapi.log.info(`[revalidate] purge ${targets.length} front(s) — ${label}`);
    await send(payload, label);

    const secondPass = setTimeout(() => {
      send(payload, `${label}, seconde passe`).catch(() => {});
    }, SECOND_PASS_MS);
    if (secondPass.unref) secondPass.unref();
  }

  function schedule(reason) {
    pendingReasons.add(reason);
    if (firstPendingAt === null) firstPendingAt = Date.now();
    if (timer) clearTimeout(timer);
    const delay = Math.max(0, Math.min(DEBOUNCE_MS, MAX_WAIT_MS - (Date.now() - firstPendingAt)));
    timer = setTimeout(() => {
      // ne pas faire échouer le cycle si la promesse rejette
      flush().catch((err) => strapi.log.warn(`[revalidate] purge interrompue (${err.message})`));
    }, delay);
    // ne bloque pas l'arrêt du process
    if (timer.unref) timer.unref();
  }

  strapi.documents.use(async (context, next) => {
    const { uid, action } = context;
    const isTrigger =
      uid?.startsWith('api::') &&
      (TRIGGER_ACTIONS.has(action) ||
        isPublishedWrite(strapi, context) ||
        (ALWAYS_PURGE_TYPES.has(uid) && ALWAYS_PURGE_ACTIONS.has(action)));
    if (!isTrigger) return next();

    // Avant l'écriture : ce qui va disparaître (entrée supprimée ou dépubliée, ancien slug,
    // relation retirée) doit être purgé aussi.
    const documentId = context.params?.documentId;
    if (documentId) {
      try {
        addChanges(await collectChanges(strapi, uid, documentId));
      } catch (err) {
        strapi.log.warn(`[revalidate] ${uid} ${documentId} : état avant écriture non relu (${err.message})`);
      }
    }

    const result = await next();

    const writtenId = documentId ?? result?.documentId;
    if (action !== 'delete' && writtenId) pendingDocuments.set(`${uid}|${writtenId}`, { uid, documentId: writtenId });
    else if (!writtenId) addChanges([{ type: uid }]);
    schedule(`${action} ${uid}`);

    return result;
  });

  strapi.log.info(
    `[revalidate] purge activée (publish/unpublish/delete, écritures publiées par l'API, + create/update sur ${[...ALWAYS_PURGE_TYPES].join(', ')}) → ${targets.map((t) => t.name).join(', ')}`,
  );

  /**
   * PV-255 — purge de documents qui changent sans écriture : un article programmé (PV-204) paraît
   * quand sa date `publishAt` passe, sans que rien ne soit enregistré. Traités comme une publication :
   * leurs entrées et celles qui les affichent sont relues au moment de purger.
   */
  function enqueueDocuments(uid, documentIds, reason) {
    for (const documentId of documentIds) pendingDocuments.set(`${uid}|${documentId}`, { uid, documentId });
    schedule(reason);
  }

  return { enqueueDocuments };
}

module.exports = { registerStorefrontRevalidation };
