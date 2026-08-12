import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Combobox, ComboboxOption, Flex, Tag } from '@strapi/design-system';
import { Cross } from '@strapi/icons';

import { RESOURCES, fieldConfig } from './resources';

/**
 * PV-188 — sélecteur de produits, marques et catégories Medusa pour les campagnes marketing.
 *
 * Ces champs contenaient des identifiants techniques à taper à la main (`["chien", …]`), sans
 * recherche ni validation : une faute de frappe donnait une campagne qui ne s'affiche jamais.
 * On garde le même format en base — le custom field a le type d'origine (`string` ou `json`) —
 * mais la saisie passe par une liste alimentée par Medusa.
 *
 * Un seul composant sert les quatre champs : la ressource interrogée et le mode (une valeur ou
 * plusieurs) viennent du nom du custom field, cf. `resources.js`.
 */
const MedusaPickerInput = (props) => {
  const { attribute, name, onChange, value, intlLabel, error, required, description, labelAction } = props;

  const config = fieldConfig(attribute?.customField) ?? { resource: 'products', multiple: false };
  const resource = RESOURCES[config.resource];
  const multiple = config.multiple;

  // En base : une chaîne pour les champs simples, un tableau pour les champs JSON. Strapi peut
  // aussi transmettre le JSON encore sérialisé selon le contexte → on tolère les deux.
  const selected = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const raw = value.trim();
      if (!multiple) return [raw];
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [raw];
      }
      catch {
        return [raw];
      }
    }
    return [];
  }, [value, multiple]);

  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [labels, setLabels] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const debounceRef = useRef(null);

  // Recherche (déclenchée à la frappe, temporisée pour ne pas marteler Medusa).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setFetchError(null);
      resource
        .search(query)
        .then((opts) => {
          setOptions(opts);
          setLabels((prev) => ({ ...prev, ...Object.fromEntries(opts.map((o) => [o.value, o.label])) }));
        })
        .catch((err) => setFetchError(err.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, config.resource]);

  // Noms lisibles des valeurs déjà enregistrées (sinon on afficherait l'identifiant brut).
  useEffect(() => {
    const missing = selected.filter((h) => !labels[h]);
    if (!missing.length) return;
    resource
      .resolve(missing)
      .then((found) => setLabels((prev) => ({
        ...prev,
        ...Object.fromEntries(found.map((o) => [o.value, o.label])),
      })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join('|')]);

  function emit(next) {
    const payload = multiple ? next : (next[0] ?? '');
    // On transmet le type sous-jacent réel du champ, pas `attribute.type` qui vaut
    // « customField » dans le Content Manager.
    onChange({ target: { name, value: payload, type: multiple ? 'json' : 'string' } });
  }

  function add(handle) {
    if (!handle) return;
    if (!multiple) return emit([handle]);
    if (selected.includes(handle)) return;
    emit([...selected, handle]);
  }

  function remove(handle) {
    emit(selected.filter((h) => h !== handle));
  }

  // En mode multiple la Combobox ne garde pas la valeur : elle sert à ajouter, les valeurs
  // retenues sont affichées en dessous sous forme d'étiquettes.
  const comboValue = multiple ? '' : (selected[0] ?? '');
  const visibleOptions = multiple ? options.filter((o) => !selected.includes(o.value)) : options;

  return (
    <Field.Root
      name={name}
      id={name}
      error={error || fetchError}
      hint={description?.defaultMessage}
      required={required}
    >
      <Field.Label action={labelAction}>{intlLabel?.defaultMessage ?? name}</Field.Label>

      <Combobox
        value={comboValue}
        onChange={add}
        onInputChange={(e) => setQuery(e.target.value)}
        autocomplete="none"
        loading={loading}
        loadingMessage="Chargement…"
        creatable={config.creatable ? true : undefined}
        createMessage={config.creatable ? (v) => `Utiliser « ${v} » tel quel` : undefined}
        onCreateOption={config.creatable ? (v) => add(v) : undefined}
        noOptionsMessage={() => (fetchError ? `Erreur : ${fetchError}` : resource.empty)}
        placeholder={resource.placeholder}
      >
        {visibleOptions.map((opt) => (
          <ComboboxOption key={opt.value} value={opt.value}>
            {opt.label}
          </ComboboxOption>
        ))}
      </Combobox>

      {multiple && selected.length > 0 && (
        <Flex gap={2} wrap="wrap" paddingTop={2}>
          {selected.map((handle) => (
            <Tag key={handle} icon={<Cross />} onClick={() => remove(handle)}>
              {labels[handle] ?? handle}
            </Tag>
          ))}
        </Flex>
      )}

      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export default MedusaPickerInput;
