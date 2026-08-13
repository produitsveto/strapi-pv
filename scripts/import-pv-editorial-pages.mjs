/**
 * PV-190 — Remplit les single types `pv-*` (pages éditoriales de produits-veto.com).
 *
 * Contexte : les deux storefronts lisaient les mêmes single types `deals-*`.
 * produits-veto.com servait donc les CGV, mentions légales, livraison… d'Anti-Gaspi.
 * Chaque site a maintenant ses propres entrées ; ce script remplit celles de PV.
 *
 * Deux sources selon la page :
 *   - `legacy` : le HTML de la page WordPress de produits-veto.com, qui fait autorité
 *                (contenu réglementaire : repris tel quel, jamais réécrit).
 *   - `copy`   : le single type `deals-*` correspondant, quand son contenu décrit
 *                déjà produits-veto.com et non Anti-Gaspi (audit du 13/08/2026).
 *
 * Idempotent : n'écrase pas une entrée pv-* déjà remplie sans --force.
 *
 * Usage :
 *   STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=xxx node scripts/import-pv-editorial-pages.mjs --dry-run
 *   STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=xxx node scripts/import-pv-editorial-pages.mjs
 *   ... --only=cgu,legal        limiter à certaines pages
 *   ... --force                 réécrire les entrées déjà remplies
 */

import sanitizeHtml from 'sanitize-html'

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '')
const STRAPI_TOKEN = process.env.STRAPI_TOKEN
const LEGACY_URL = (process.env.LEGACY_URL || 'https://www.produits-veto.com').replace(/\/$/, '')
const LOCALE = process.env.LOCALE || 'fr'

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '')
  .split(',').filter(Boolean)

if (!STRAPI_TOKEN) {
  console.error('STRAPI_TOKEN manquant (clé API avec droit update sur les single types pv-*).')
  process.exit(1)
}

/**
 * `slug` : page WordPress source. `from` : single type deals-* à recopier.
 * Les pages sans source automatique (faq, homepage, product-page) sont hors script :
 * leur structure n'est pas du HTML libre, elles se remplissent dans l'admin.
 */
const PAGES = [
  { key: 'cgu', type: 'pv-cgu', source: 'legacy', slug: 'conditions-generales-de-vente', title: 'Conditions Générales de Vente' },
  { key: 'legal', type: 'pv-legal', source: 'legacy', slug: 'mentions-legales', title: 'Mentions légales' },
  { key: 'privacy', type: 'pv-privacy', source: 'legacy', slug: 'politique-de-confidentialite', title: 'Politique de confidentialité' },
  { key: 'about', type: 'pv-about', source: 'legacy', slug: 'qui-sommes-nous', title: 'Qui sommes-nous ?' },
  { key: 'delivery', type: 'pv-delivery', source: 'legacy', slug: 'informations-livraison', title: 'Livraison' },
  { key: 'payment-info', type: 'pv-payment-info', source: 'legacy', slug: 'paiement-securise', title: 'Paiement sécurisé' },
  { key: 'loyalty', type: 'pv-loyalty', source: 'legacy', slug: 'programme-fidelite', title: 'Programme fidélité' },
  // Contenus déjà écrits pour produits-veto.com : aucun marqueur Anti-Gaspi à l'audit.
  { key: 'veterinary-medicine', type: 'pv-veterinary-medicine', source: 'copy', from: 'deals-veterinary-medicine' },
  { key: 'partner', type: 'pv-partner', source: 'copy', from: 'deals-partner' },
  { key: 'contact', type: 'pv-contact', source: 'copy', from: 'deals-contact' },
  // Structures à composants, sans équivalent exploitable dans le legacy (accordéons
  // Elementor) : on repart de Deals en écartant ce qui ne parle que d'Anti-Gaspi.
  { key: 'faq', type: 'pv-faq', source: 'copy', from: 'deals-faq' },
  { key: 'product-page', type: 'pv-product-page', source: 'copy', from: 'deals-product-page' },
]

/**
 * Marqueurs d'un contenu propre à Anti-Gaspi : produits à date courte, DDM dépassée,
 * emballages abîmés. Sur produits-veto.com ils décrivent une offre qui n'existe pas.
 */
const ANTI_GASPI = /anti-?gaspi|date courte|dates courtes|ddm|emballage[s]? ab[îi]m|gaspillage|deals\.produits-veto/i

/** Vide les champs texte et écarte les entrées de composant qui parlent d'Anti-Gaspi. */
const dropAntiGaspi = (value, dropped) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        const hit = ANTI_GASPI.test(JSON.stringify(item))
        if (hit) dropped.push(item.question || item.title || item.label || '(entrée)')
        return !hit
      })
      .map((item) => dropAntiGaspi(item, dropped))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => {
      if (typeof v === 'string' && ANTI_GASPI.test(v)) {
        dropped.push(`${k}="${v.slice(0, 40)}…"`)
        return [k, null]
      }
      return [k, dropAntiGaspi(v, dropped)]
    }))
  }
  return value
}

const api = async (path, options = {}) => {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${STRAPI_TOKEN}`,
      'content-type': 'application/json',
      ...options.headers,
    },
  })
  const body = await res.text()
  let json
  try { json = body ? JSON.parse(body) : null } catch { json = null }
  return { status: res.status, ok: res.ok, json, body }
}

/**
 * Les pages legacy sont construites sous Elementor : le HTML rendu est un empilement
 * de div/span de mise en page qui noie le texte (densité mesurée de 5 % à 77 % selon
 * la page). On ne garde que le balisage sémantique — le reste est du gabarit WordPress
 * qui n'a aucun sens dans un bloc rich-text.
 */
const cleanLegacyHtml = (html) => {
  const withoutWpArtifacts = html
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '')
    .replace(/\[\/?[a-z_][^\]]*\]/gi, '')

  const semantic = sanitizeHtml(withoutWpArtifacts, {
    allowedTags: [
      'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
      'a', 'br', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img',
    ],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt'] },
    // Ces balises partent avec leur contenu : icônes et scripts de gabarit.
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'svg'],
    // Les h1 deviennent des h2 : le titre de page est déjà rendu par le storefront.
    transformTags: { h1: 'h2' },
  })

  return semantic
    // Paragraphes et items vidés de leur contenu par le nettoyage.
    .replace(/<(p|li|h[2-6])>(\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi, '')
    .replace(/<(ul|ol)>\s*<\/\1>/gi, '')
    .replace(/(\s|&nbsp;)+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/<ul>(?:(?!<\/ul>).)*?<\/ul>/gi, (list) => (isNavigationList(list) ? '' : list))
    // Le legacy pointe en absolu sur son propre domaine : à la bascule, ce sont
    // les URLs du nouveau site. On les repasse en relatif.
    .replace(/https?:\/\/(?:www\.)?produits-veto\.com\/?/gi, '/')
    .trim()
}

/**
 * Les gabarits Elementor injectent le menu « pages légales » en tête de chaque page,
 * parfois deux fois. Une liste qui ne fait que pointer vers au moins trois de ces
 * pages est ce menu, pas du contenu rédactionnel — les listes du texte, elles,
 * portent des phrases.
 */
const NAV_SLUGS = [
  'conditions-generales-de-vente', 'mentions-legales', 'politique-de-confidentialite',
  'protection-des-donnees', 'faq-un-petit-coup-de-patte', 'contact', 'qui-sommes-nous',
]

const isNavigationList = (list) => {
  const items = list.match(/<li>[\s\S]*?<\/li>/gi) || []
  if (items.length < 3) return false
  const onlyLinks = items.every((li) => /^<li><a\b[^>]*>[^<]*<\/a><\/li>$/i.test(li))
  if (!onlyLinks) return false
  const hits = NAV_SLUGS.filter((slug) => list.includes(slug)).length
  return hits >= 3
}

const fetchLegacyPage = async (slug) => {
  const res = await fetch(`${LEGACY_URL}/wp-json/wp/v2/pages?slug=${slug}&_fields=title,content`)
  if (!res.ok) throw new Error(`WP ${res.status} sur ${slug}`)
  const [page] = await res.json()
  if (!page) throw new Error(`page legacy introuvable : ${slug}`)
  return {
    title: page.title?.rendered?.trim(),
    html: cleanLegacyHtml(page.content?.rendered || ''),
  }
}

/** Champs gérés par Strapi, à ne jamais renvoyer en écriture. */
const SYSTEM_FIELDS = new Set([
  'id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale',
  'createdBy', 'updatedBy', 'localizations',
])

/** Retire récursivement les identifiants internes, que Strapi refuse en écriture. */
const stripIds = (value) => {
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !SYSTEM_FIELDS.has(k) || k === 'locale')
        .filter(([k]) => k !== 'locale')
        .map(([k, v]) => [k, stripIds(v)]),
    )
  }
  return value
}

const run = async () => {
  const targets = ONLY.length ? PAGES.filter((p) => ONLY.includes(p.key)) : PAGES
  if (!targets.length) {
    console.error(`--only ne correspond à aucune page. Clés : ${PAGES.map((p) => p.key).join(', ')}`)
    process.exit(1)
  }

  console.log(`Strapi : ${STRAPI_URL}`)
  console.log(`Locale : ${LOCALE}${DRY_RUN ? '   [DRY RUN]' : ''}${FORCE ? '   [FORCE]' : ''}\n`)

  let written = 0
  let skipped = 0
  let failed = 0

  for (const page of targets) {
    const label = page.type.padEnd(26)

    try {
      // 1. L'entrée cible est-elle déjà remplie ?
      const existing = await api(`/${page.type}?locale=${LOCALE}&populate=*`)
      const current = existing.json?.data
      const isFilled = Boolean(current && (current.title || current.blocks?.length))

      if (isFilled && !FORCE) {
        console.log(`${label} déjà rempli — ignoré (--force pour réécrire)`)
        skipped++
        continue
      }

      // 2. Construire le payload selon la source.
      let payload
      let origin

      if (page.source === 'legacy') {
        const legacy = await fetchLegacyPage(page.slug)
        if (!legacy.html) throw new Error(`contenu legacy vide (${page.slug})`)
        payload = {
          title: page.title || legacy.title,
          blocks: [{ __component: 'shared.rich-text', body: legacy.html }],
        }
        origin = `legacy /${page.slug} (${legacy.html.length} car.)`
      } else {
        const src = await api(`/${page.from}?locale=${LOCALE}&populate=*`)
        if (!src.json?.data) throw new Error(`source ${page.from} vide ou inaccessible (${src.status})`)
        const dropped = []
        payload = dropAntiGaspi(stripIds(src.json.data), dropped)
        origin = `copie de ${page.from}`
        if (dropped.length) {
          origin += ` — ${dropped.length} élément(s) Anti-Gaspi écarté(s) : ${dropped.map((d) => `« ${String(d).slice(0, 60)} »`).join(', ')}`
        }
      }

      if (DRY_RUN) {
        console.log(`${label} → ${origin}`)
        written++
        continue
      }

      // 3. Écrire puis publier (Strapi v5 : l'écriture alimente le draft).
      const put = await api(`/${page.type}?locale=${LOCALE}`, {
        method: 'PUT',
        body: JSON.stringify({ data: payload }),
      })
      if (!put.ok) throw new Error(`PUT ${put.status} — ${put.body.slice(0, 200)}`)

      const publish = await api(`/${page.type}?locale=${LOCALE}&status=published`, {
        method: 'PUT',
        body: JSON.stringify({ data: payload }),
      })
      if (!publish.ok) throw new Error(`publication ${publish.status} — ${publish.body.slice(0, 200)}`)

      console.log(`${label} ✓ ${origin}`)
      written++
    } catch (error) {
      console.error(`${label} ✗ ${error.message}`)
      failed++
    }
  }

  console.log(`\n${written} écrite(s), ${skipped} ignorée(s), ${failed} en échec.`)
  if (failed) process.exit(1)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
