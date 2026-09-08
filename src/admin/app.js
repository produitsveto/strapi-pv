import { setPluginConfig, defaultHtmlPreset } from '@_sh/strapi-plugin-ckeditor';

// PV-214 — corrections CSS du back-office (listes déroulantes tronquées par le design system).
//
// ⚠️ Un `import './extensions/pv-admin.css'` ne suffit PAS : en build de production, Vite en fait
// une feuille séparée que l'admin Strapi ne référence jamais (aucun `<link rel=stylesheet>` dans
// la page — tout le style du design system passe par styled-components, à l'exécution). Le
// serveur de développement, lui, injecte les CSS du graphe de modules : le correctif y marchait,
// et seulement là. D'où `?inline`, qui nous rend la feuille sous forme de chaîne à poser
// nous-mêmes dans le `<head>`.
import pvAdminCss from './extensions/pv-admin.css?inline';

const config = {
  locales: ['fr'],
};

const PV_STYLE_ID = 'pv-admin-styles';

const bootstrap = () => {
  if (typeof document === 'undefined' || document.getElementById(PV_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PV_STYLE_ID;
  style.textContent = pvAdminCss;
  document.head.appendChild(style);
};

export default {
  config,
  register(app) {
    // PV-199 — CKEditor ne propose qu'un seul preset, celui qui produit du HTML.
    // Le preset Markdown livré par le plugin réintroduirait exactement le décalage
    // de format qu'on corrige ici : le storefront rend le contenu en `v-html`.
    // Le plugin construit la liste déroulante du Content-Type Builder dans son
    // `bootstrap()`, donc après ce `register()` : elle n'affichera que « defaultHtml ».
    setPluginConfig({ presets: [defaultHtmlPreset] });

    app.customFields.register({
      name: 'deal-ref',
      type: 'string',
      intlLabel: {
        id: 'deal-picker.deal-ref.label',
        defaultMessage: 'Deal Medusa',
      },
      intlDescription: {
        id: 'deal-picker.deal-ref.description',
        defaultMessage: 'Sélectionne un deal (DLC ou emballage abîmé) depuis Medusa',
      },
      components: {
        Input: async () => import('./components/DealPicker/Input'),
      },
    });

    // PV-188 — sélecteurs Medusa des campagnes marketing : mêmes valeurs stockées qu'avant
    // (handles), mais choisies dans une liste au lieu d'être tapées à la main.
    const medusaPicker = async () => import('./components/MedusaPicker/Input');
    const pickers = [
      ['medusa-brand', 'string', 'Marque / laboratoire', 'Choisis la marque ciblée par la campagne'],
      ['medusa-brands', 'json', 'Marques mises en avant', 'Marques poussées, dans l’ordre d’affichage'],
      ['medusa-products', 'json', 'Produits mis en avant', 'Produits de la campagne, dans l’ordre d’affichage'],
      ['medusa-targets', 'json', 'Cibles de la campagne', 'Catégories visées. Pour une bannière de méga-menu, saisis la famille telle quelle'],
      ['medusa-countries', 'json', 'Pays', 'Laisse vide pour diffuser partout'],
      ['pv-locales', 'json', 'Langues', 'Laisse vide pour diffuser dans les deux langues'],
    ];
    for (const [fieldName, type, label, hint] of pickers) {
      app.customFields.register({
        name: fieldName,
        type,
        intlLabel: { id: `medusa-picker.${fieldName}.label`, defaultMessage: label },
        intlDescription: { id: `medusa-picker.${fieldName}.description`, defaultMessage: hint },
        components: { Input: medusaPicker },
      });
    }
  },
  bootstrap,
};
