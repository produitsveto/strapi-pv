/**
 * PV-175 — Crée et configure les rôles admin Strapi (« Service Clients », « Marketing »…).
 *
 * Pourquoi un script : les rôles et leurs permissions vivent en base (`admin_roles`,
 * `admin_permissions`), pas dans le dépôt. Les régler à la main dans l'UI ne laisse aucune trace,
 * doit être refait sur chaque environnement, et se déphase au premier content type ajouté.
 *
 * ⭐ Le script ne code EN DUR aucune liste de champs ni de langues : il lit
 * `GET /admin/permissions` et déduit, pour chaque type et chaque action, les propriétés que
 * Strapi accepte réellement (`fields`, `locales`). Un champ ou une langue ajoutés plus tard sont
 * donc pris en compte au prochain passage, sans toucher au script.
 *
 * Idempotent : rejouable à volonté, l'état final ne dépend pas du nombre d'exécutions.
 * Il ne supprime jamais un rôle et ne touche jamais à Super Admin.
 *
 * Usage :
 *   STRAPI_URL=http://localhost:1337 \
 *   STRAPI_ADMIN_EMAIL=… STRAPI_ADMIN_PASSWORD=… \
 *   node scripts/provision-admin-roles.mjs --dry-run
 *
 *   ... sans --dry-run            applique
 *   ... --only="Marketing"        limiter à un rôle
 *
 * ⚠️ L'API `/admin/*` n'accepte PAS un token d'API Strapi : il lui faut un jeton de session
 * obtenu par `POST /admin/login`. D'où le couple email/mot de passe.
 */

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '')
const EMAIL = process.env.STRAPI_ADMIN_EMAIL
const PASSWORD = process.env.STRAPI_ADMIN_PASSWORD

const DRY_RUN = process.argv.includes('--dry-run')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '')
  .split(',').map((s) => s.trim()).filter(Boolean)

if (!EMAIL || !PASSWORD) {
  console.error('STRAPI_ADMIN_EMAIL / STRAPI_ADMIN_PASSWORD manquants.')
  process.exit(1)
}

/* ------------------------------------------------------------------------- *
 * Le référentiel — c'est la SEULE partie à modifier quand PA change d'avis.
 * ------------------------------------------------------------------------- */

/**
 * Langues ouvertes à l'écriture. Les traductions sont produites par le job nocturne (PV-60) :
 * une saisie humaine dans une langue traduite serait écrasée à la passe suivante.
 * `null` = toutes les langues du serveur.
 */
const WRITE_LOCALES = ['fr']
const READ_LOCALES = null

/** Raccourcis d'actions du Content Manager. */
const READ = ['read']
const CONTRIBUTE = ['read', 'create', 'update', 'publish']

/**
 * Droits sur le catalogue produit.
 *
 * ⭐ Arbitrage PA du 09/09/2026 : « Ok tant que pas de migration, mais à la suite ils doivent
 * avoir accès. » La lecture seule n'est donc PAS définitive — elle protège le catalogue tant que
 * WooCommerce en est le maître et que la synchro nocturne réécrit les fiches chaque nuit. Une
 * saisie faite dans Strapi d'ici là serait écrasée à 03h00 sans que personne ne le voie passer.
 *
 * ⏳ À la fin de la migration, quand la synchro Woo→Medusa→Strapi est arrêtée : passer cette
 * constante à CONTRIBUTE et rejouer le script. C'est la seule ligne à changer.
 */
const CATALOGUE = READ

const ROLES = [
  {
    name: 'Service Clients',
    description:
      'Répond aux clients : peut corriger un article, une campagne ou une étiquette. '
      + 'Le catalogue produit est en lecture seule tant que la migration WooCommerce est en cours.',
    collectionTypes: {
      // 🚨 Tant que la migration n'est pas finie : lecture seule (cf. CATALOGUE ci-dessus).
      'api::product.product': CATALOGUE,
      'api::article.article': CONTRIBUTE,
      'api::marketing-campaign.marketing-campaign': CONTRIBUTE,
      'api::tag.tag': CONTRIBUTE,
      // ✅ PA, 09/09/2026 : « Dans ce cas laisse les visibles ». Ces trois types sont absents de
      // sa liste d'origine, mais un article les porte en relation : sans droit de lecture, les
      // champs Catégories, Catégories Blog et Espèces affichent des identifiants opaques au lieu
      // des libellés. Lecture seule — le service client n'a pas à créer de référentiel.
      'api::category.category': READ,
      'api::blog-category.blog-category': READ,
      'api::species.species': READ,
    },
    singleTypes: {},
    // Sans ça, impossible d'insérer une image dans un article ou une bannière de campagne.
    // Volontairement sans `assets.update` : pas de suppression ni de remplacement d'un média
    // déjà utilisé ailleurs.
    plugins: [
      'plugin::upload.read',
      'plugin::upload.assets.create',
      'plugin::upload.assets.download',
      'plugin::upload.assets.copy-link',
    ],
  },
  {
    name: 'Marketing',
    description:
      'Produit le contenu éditorial et les campagnes : articles, catégories, espèces, '
      + 'laboratoires, étiquettes. Le catalogue produit reste en lecture seule.',
    collectionTypes: {
      'api::product.product': CATALOGUE,
      'api::article.article': CONTRIBUTE,
      'api::marketing-campaign.marketing-campaign': CONTRIBUTE,
      'api::blog-category.blog-category': CONTRIBUTE,
      'api::category.category': CONTRIBUTE,
      'api::species.species': CONTRIBUTE,
      'api::tag.tag': CONTRIBUTE,
      'api::laboratory.laboratory': CONTRIBUTE,
      // ✅ PA, 09/09/2026 : « OK ». Absent de sa liste d'origine, mais un article porte un `author`.
      // Sans droit de lecture ici, le sélecteur « Auteur » d'un article n'affiche plus des noms
      // mais des identifiants opaques : Strapi retombe sur `documentId` quand le mainField de la
      // cible n'est pas lisible (@strapi/content-manager, controllers/relations.js →
      // sanitizeMainField). Contrepartie : « PV - Auteur » réapparaît dans le menu.
      'api::author.author': READ,
    },
    singleTypes: {},
    plugins: [
      'plugin::upload.read',
      'plugin::upload.assets.create',
      'plugin::upload.assets.update',
      'plugin::upload.assets.download',
      'plugin::upload.assets.copy-link',
    ],
  },
  // ❌ PA, 09/09/2026 : « Non ne crée rien ». Pas de rôle « Pharmacien » : un pharmacien n'a pas
  // de compte Strapi, il travaille dans l'admin Medusa (PV-212). Un rôle sans permission n'aurait
  // ouvert qu'un back-office vide. Ne pas le réintroduire sans nouvel arbitrage.
]

/* ------------------------------------------------------------------------- *
 * Mécanique
 * ------------------------------------------------------------------------- */

let token = null

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : null
}

async function login() {
  const res = await api('/admin/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
  token = res.data.token
}

/**
 * Traduit le référentiel en permissions Strapi, en s'appuyant sur ce que le serveur déclare.
 * `applyToProperties` dit, action par action, si `fields` et/ou `locales` s'appliquent — un type
 * non localisé (author, marketing-campaign…) n'a pas de propriété `locales` et ne doit pas en
 * recevoir, sinon le PUT est rejeté.
 */
function buildPermissions(role, sections) {
  const permissions = []

  for (const [kind, key] of [['collectionTypes', 'collectionTypes'], ['singleTypes', 'singleTypes']]) {
    const section = sections[key]
    const wanted = role[kind] || {}

    for (const [uid, actions] of Object.entries(wanted)) {
      const subject = section.subjects.find((s) => s.uid === uid)
      if (!subject) {
        console.warn(`  ⚠️  ${uid} inconnu du serveur — ignoré`)
        continue
      }
      const fieldsProp = subject.properties.find((p) => p.value === 'fields')
      const localesProp = subject.properties.find((p) => p.value === 'locales')

      for (const short of actions) {
        const actionId = `plugin::content-manager.explorer.${short}`
        const action = section.actions.find((a) => a.actionId === actionId)
        if (!action) {
          console.warn(`  ⚠️  action ${short} indisponible sur ${kind} — ignorée`)
          continue
        }
        const applies = action.applyToProperties || []
        const properties = {}

        if (applies.includes('fields') && fieldsProp) {
          properties.fields = leafFields(fieldsProp.children)
        }
        if (applies.includes('locales') && localesProp) {
          const all = localesProp.children.map((c) => c.value)
          const allowed = short === 'read' ? READ_LOCALES : WRITE_LOCALES
          properties.locales = allowed ? all.filter((l) => allowed.includes(l)) : all
        }

        permissions.push({ action: actionId, subject: uid, properties, conditions: [] })
      }
    }
  }

  for (const action of role.plugins || []) {
    if (!sections.plugins.some((p) => p.action === action)) {
      console.warn(`  ⚠️  ${action} inconnu du serveur — ignoré`)
      continue
    }
    permissions.push({ action, subject: null, properties: {}, conditions: [] })
  }

  return permissions
}

/** Les composants imbriqués sont décrits en arbre ; Strapi attend des chemins « a.b.c ». */
function leafFields(children, prefix = '') {
  return children.flatMap((child) => {
    const path = prefix ? `${prefix}.${child.value}` : child.value
    return child.children?.length ? leafFields(child.children, path) : [path]
  })
}

/** Comparaison stable, pour n'écrire que si l'état diffère vraiment. */
function fingerprint(permissions) {
  return JSON.stringify(
    permissions
      .map((p) => ({
        action: p.action,
        subject: p.subject ?? null,
        fields: [...(p.properties?.fields || [])].sort(),
        locales: [...(p.properties?.locales || [])].sort(),
      }))
      .sort((a, b) => `${a.action}${a.subject}`.localeCompare(`${b.action}${b.subject}`)),
  )
}

async function main() {
  await login()
  console.log(`Strapi : ${STRAPI_URL}\n`)

  const sections = (await api('/admin/permissions')).data.sections
  const existing = (await api('/admin/roles')).data

  for (const role of ROLES) {
    if (ONLY.length && !ONLY.includes(role.name)) continue
    console.log(`▸ ${role.name}`)

    let target = existing.find((r) => r.name === role.name)
    if (target && target.code === 'strapi-super-admin') {
      console.log('  ⏭️  Super Admin — jamais modifié')
      continue
    }

    if (!target) {
      if (DRY_RUN) {
        console.log('  + rôle à créer')
      } else {
        target = (await api('/admin/roles', {
          method: 'POST',
          body: { name: role.name, description: role.description },
        })).data
        console.log(`  + rôle créé (id ${target.id})`)
      }
    } else if (target.description !== role.description) {
      if (DRY_RUN) console.log('  ~ description à mettre à jour')
      else {
        await api(`/admin/roles/${target.id}`, {
          method: 'PUT',
          body: { name: role.name, description: role.description },
        })
        console.log('  ~ description mise à jour')
      }
    }

    const wanted = buildPermissions(role, sections)
    const summary = `${wanted.length} permissions · ${Object.keys(role.collectionTypes || {}).length} types de collections`
      + ` · ${Object.keys(role.singleTypes || {}).length} types uniques · ${(role.plugins || []).length} plugins`

    if (!target) {
      console.log(`  = ${summary} (rôle non créé en dry-run)\n`)
      continue
    }

    const current = (await api(`/admin/roles/${target.id}/permissions`)).data
    if (fingerprint(current) === fingerprint(wanted)) {
      console.log(`  ✓ déjà conforme — ${summary}\n`)
      continue
    }

    if (DRY_RUN) {
      console.log(`  ~ permissions à réécrire — ${summary}`)
      console.log(`    (actuel : ${current.length} permissions)\n`)
      continue
    }

    await api(`/admin/roles/${target.id}/permissions`, { method: 'PUT', body: { permissions: wanted } })
    console.log(`  ✓ permissions écrites — ${summary}\n`)
  }

  console.log(DRY_RUN ? 'Dry-run : rien n’a été écrit.' : 'Terminé.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
