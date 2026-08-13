import TranslationPanel from './TranslationPanel';

/**
 * PV-60 — enregistrement du panneau dans le Content Manager.
 *
 * Le panneau se place en tête de la colonne de droite : l'état des traductions
 * est ce qu'on vient vérifier après avoir modifié un texte français.
 */
export default {
  register() {},

  bootstrap(app) {
    const contentManager = app.getPlugin('content-manager');
    if (!contentManager) return;
    contentManager.apis.addEditViewSidePanel((panels) => [TranslationPanel, ...panels]);
  },
};
