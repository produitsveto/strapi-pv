'use strict';

/**
 * La vue liste du content-manager peuple/compte TOUJOURS toutes les relations
 * du modèle (Strapi core, non configurable via "Configure the view" — vérifié
 * dans populate.js: getDeepPopulate() boucle sur Object.keys(model.attributes)
 * sans lire layouts.list/metadatas). Avec les 9 relations d'Article (dont
 * tags: 401 lignes), ça sature le pool Postgres et fait planter l'instance
 * Strapi Cloud à chaque ouverture de la liste. Bug connu et jamais corrigé
 * par l'éditeur (https://github.com/strapi/strapi/issues/8553, encore
 * signalé en 2026 sur #25200) ; workaround confirmé par la communauté et par
 * Strapi lui-même : surcharger le service via l'extension officielle.
 *
 * On n'allège que la signature d'appel exacte de la LISTE
 * (populateDeep(1) + countRelations({toMany:true, toOne:false})) et
 * uniquement pour Article. L'édition (findOne, populateDeep(Infinity))
 * n'est jamais affectée : les relations restent pleinement éditables.
 */
const LIGHT_POPULATE_UID = 'api::article.article';
const LIGHT_POPULATE = { categories: { count: true } };

module.exports = (plugin) => {
  // plugin.services['populate-builder'] est une "service factory" appelée une
  // fois par Strapi au boot (avec {strapi}) ; son retour est la vraie factory
  // (uid) => builder utilisée partout via getService('populate-builder').
  // Il faut donc surcharger à ce niveau-là, pas directement (uid) => ....
  const originalServiceFactory = plugin.services['populate-builder'];

  plugin.services['populate-builder'] = (ctx) => {
    const originalPopulateBuilder = originalServiceFactory(ctx);

    return (uid) => {
      const builder = originalPopulateBuilder(uid);
      let maxLevel;
      let countOpts;

      // On délègue tout au builder d'origine plutôt que de réécrire sa surface :
      // la 5.54 a ajouté `withPopulateOverride()`, appelée par les contrôleurs du
      // content-manager ET par les handlers MCP. Une enveloppe qui n'énumère que
      // les méthodes connues casse donc l'admin à chaque nouveauté du core.
      const wrapper = new Proxy(builder, {
        get(target, prop, receiver) {
          if (prop === 'build') {
            return async () => {
              const isArticleListPopulate =
                uid === LIGHT_POPULATE_UID &&
                maxLevel === 1 &&
                countOpts?.toMany === true &&
                countOpts?.toOne === false;

              return isArticleListPopulate ? LIGHT_POPULATE : target.build();
            };
          }

          const value = Reflect.get(target, prop, receiver);
          if (typeof value !== 'function') return value;

          return (...args) => {
            if (prop === 'populateDeep') maxLevel = args[0];
            if (prop === 'countRelations') countOpts = args[0] ?? { toMany: true, toOne: true };

            const result = value.apply(target, args);
            // Les méthodes chaînables rendent le builder d'origine : on garde la
            // main en rendant le proxy, sinon on perd notre `build()`.
            return result === target ? wrapper : result;
          };
        },
      });

      return wrapper;
    };
  };

  return plugin;
};
