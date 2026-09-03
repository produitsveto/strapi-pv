'use strict';

/**
 * PV-60 — retire `translationMeta` des formulaires d'édition.
 *
 * Le champ mémorise, pour chaque contenu et chaque langue, l'empreinte du texte
 * français traduit et celle de la traduction produite. C'est ce qui permet à la
 * passe nocturne de reconnaître une correction manuelle et de ne jamais
 * l'écraser. Il n'a donc rien à faire sous les yeux d'un rédacteur : sans ce
 * nettoyage, il s'affiche comme un bloc JSON incompréhensible au milieu du
 * formulaire.
 *
 * Marquer le champ `visible: false` au schéma ne suffit pas : Strapi n'applique
 * cette option qu'à la *création* de la disposition. Sur les contenus qui
 * existaient déjà, la disposition enregistrée en base gagne.
 *
 * On ne retire que ce champ, en laissant le reste de la disposition intact :
 * l'ordre des champs et les libellés sont du réglage utilisateur.
 *
 * Ce code vivait dans le plugin « Traduction » (bouton de relance à la demande),
 * retiré le 03/09/2026 au profit de la seule passe nocturne. Le champ, lui,
 * reste indispensable.
 */

const configStore = (strapi) => strapi.store({ type: 'plugin', name: 'content_manager' });

async function hideTranslationMeta({ strapi }) {
  for (const [uid, model] of Object.entries(strapi.contentTypes)) {
    if (!model.attributes?.translationMeta) continue;

    // Le store préfixe lui-même la clé avec le type et le nom : la clé complète
    // en base est `plugin_content_manager_configuration_content_types::<uid>`.
    const key = `configuration_content_types::${uid}`;
    const config = await configStore(strapi).get({ key });
    if (!config?.layouts?.edit) continue;

    const edit = config.layouts.edit
      .map((row) => row.filter((field) => field.name !== 'translationMeta'))
      .filter((row) => row.length > 0);

    if (JSON.stringify(edit) === JSON.stringify(config.layouts.edit)) continue;

    await configStore(strapi).set({ key, value: { ...config, layouts: { ...config.layouts, edit } } });
  }
}

module.exports = { hideTranslationMeta };
