/**
 * Seed des 7 espèces racines (PV-130) — dérivées des catégories produit
 * existantes (chien/chat/cheval/NAC/ferme/oiseaux/abeilles).
 *
 * Idempotent : vérifie l'existence par slug avant de créer, ne met rien à
 * jour si l'entrée existe déjà.
 *
 * Usage :
 *   STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=xxx node scripts/seed-species.mjs
 *   STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=xxx node scripts/seed-species.mjs --dry-run
 */

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '')
const STRAPI_TOKEN = process.env.STRAPI_TOKEN
const DRY_RUN = process.argv.includes('--dry-run')

if (!STRAPI_TOKEN) {
  console.error('STRAPI_TOKEN manquant (clé API avec droit create sur species).')
  process.exit(1)
}

const SPECIES = [
  { slug: 'chien', name: 'Chien' },
  { slug: 'chat', name: 'Chat' },
  { slug: 'cheval', name: 'Cheval' },
  { slug: 'nac', name: 'Nouveaux animaux de compagnie (NAC)' },
  { slug: 'animaux-de-la-ferme', name: 'Animaux de la ferme' },
  { slug: 'oiseaux', name: 'Oiseaux' },
  { slug: 'abeilles', name: 'Abeilles' },
]

async function strapiFetch(path, options = {}) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} → ${res.status} ${await res.text()}`)
  }
  return res.json()
}

async function findBySlug(slug) {
  const res = await strapiFetch(`/species-entries?filters[slug][$eq]=${encodeURIComponent(slug)}`)
  return res.data?.[0] ?? null
}

async function main() {
  let created = 0
  let skipped = 0

  for (const species of SPECIES) {
    const existing = await findBySlug(species.slug)
    if (existing) {
      console.log(`⏭  ${species.name} (${species.slug}) — déjà présente, skip`)
      skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`＋ ${species.name} (${species.slug}) — serait créée`)
      created++
      continue
    }

    await strapiFetch('/species-entries', {
      method: 'POST',
      body: JSON.stringify({ data: { name: species.name, slug: species.slug, visibilite: true, publishedAt: new Date().toISOString() } }),
    })
    console.log(`✅ ${species.name} (${species.slug}) — créée`)
    created++
  }

  console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}${created} créée(s), ${skipped} déjà présente(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
