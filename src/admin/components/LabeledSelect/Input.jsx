import { Field, SingleSelect, SingleSelectOption } from '@strapi/design-system';

// PV-378 — l'énumération native de Strapi affiche la valeur technique (« solution-pour-inhalation »,
// « CATEGORY_BANNER »). Les valeurs permises restent celles du schéma (`attribute.enum`) : seul
// l'affichage change, avec un jeu de libellés par custom field.

// Libellés repris de `apps/produits-veto/i18n/locales/fr.json` (`galenicForms`), ceux du site.
const GALENIC_FORMS = {
  'ampoule-buvable': 'Ampoule buvable',
  'bande-pansement': 'Bande, pansement',
  'batonnet-barre-friandise': 'Bâtonnet, barre, friandise',
  baume: 'Baume',
  'bouchee-croquette': 'Bouchée, croquette',
  collier: 'Collier',
  collyre: 'Collyre',
  comprime: 'Comprimé',
  'creme-pommade-gel': 'Crème, pommade, gel',
  'gelule-capsule': 'Gélule, capsule',
  'goutte-auriculaire': 'Goutte auriculaire',
  'goutte-ophtalmique': 'Goutte ophtalmique',
  'laniere-plaquette-ruban': 'Lanière, plaquette, ruban',
  'lingette-coton': 'Lingette, coton',
  'lotion-liquide': 'Lotion, liquide',
  'pate-seringue': 'Pâte, seringue',
  pellets: 'Pellets',
  'pipette-spot-on': 'Pipette, spot-on',
  poudre: 'Poudre, granulés',
  'shampooing-mousse': 'Shampooing, mousse',
  'sirop-solution-buvable': 'Sirop, solution buvable',
  'solution-pour-inhalation': 'Solution pour inhalation',
  'spray-diffuseur-fogger': 'Spray, diffuseur, fogger',
};

const CAMPAIGN_TYPES = {
  HOME_BANNER: 'Bannière d’accueil',
  CATEGORY_BANNER: 'Bannière catégorie / marque',
  FEATURED_CATEGORY_PRODUCTS: 'Produits en vedette catégorie / marque',
  MEGAMENU_BANNER: 'Bannière du méga-menu',
  TOP10_BRAND: 'Marques à la une du méga-menu',
  CROSS_SELLING: 'Vente croisée sur les fiches produit',
};

const LABELS = {
  'global::galenic-form': { labels: GALENIC_FORMS, sort: true, placeholder: 'Choisir une forme' },
  'global::campaign-type': { labels: CAMPAIGN_TYPES, sort: false, placeholder: 'Choisir un type' },
};

const LabeledSelect = (props) => {
  const { attribute, name, onChange, value, label: fieldLabel, hint, error, required, disabled } = props;
  const config = LABELS[attribute?.customField] ?? { labels: {}, sort: false, placeholder: '' };
  const label = (v) => config.labels[v] ?? v;
  const values = [...(attribute?.enum ?? [])];
  // Ordre du schéma pour les types de campagne, alphabétique pour les formes galéniques.
  const options = config.sort ? values.sort((a, b) => label(a).localeCompare(label(b), 'fr')) : values;

  // `type` doit être le type réel : avec `customField`, le formulaire ignore la saisie sans rien dire.
  const emit = (next) => onChange({ target: { name, value: next || null, type: 'enumeration' } });

  return (
    <Field.Root name={name} id={name} error={error} hint={hint} required={required}>
      <Field.Label>{fieldLabel ?? name}</Field.Label>
      <SingleSelect
        value={value ?? ''}
        onChange={emit}
        onClear={value && !required ? () => emit(null) : undefined}
        disabled={disabled}
        placeholder={config.placeholder}
      >
        {options.map((v) => (
          <SingleSelectOption key={v} value={v}>
            {label(v)}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export default LabeledSelect;
