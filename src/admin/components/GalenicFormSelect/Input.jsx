import { Field, SingleSelect, SingleSelectOption } from '@strapi/design-system';

// PV-378 — l'énumération native de Strapi affiche la valeur technique (« solution-pour-inhalation »).
// Les valeurs permises restent celles du schéma (`attribute.enum`) : seul l'affichage change.
// Libellés repris de `apps/produits-veto/i18n/locales/fr.json` (`galenicForms`), ceux du site.
const LABELS = {
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

const label = (v) => LABELS[v] ?? v;

const GalenicFormSelect = (props) => {
  const { attribute, name, onChange, value, label: fieldLabel, hint, error, required, disabled } = props;
  const options = [...(attribute?.enum ?? [])].sort((a, b) => label(a).localeCompare(label(b), 'fr'));

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
        placeholder="Choisir une forme"
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

export default GalenicFormSelect;
