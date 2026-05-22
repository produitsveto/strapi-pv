import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Combobox, ComboboxOption, Loader } from '@strapi/design-system';

// Strapi exposes STRAPI_ADMIN_* env vars to the admin bundle via process.env
// (DefinePlugin substitution at build time), NOT import.meta.env.
const MEDUSA_URL = process.env.STRAPI_ADMIN_MEDUSA_URL || 'http://localhost:9000';
const MEDUSA_PUBLISHABLE_KEY = process.env.STRAPI_ADMIN_MEDUSA_PUBLISHABLE_KEY || '';

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatPrice(amount, currency) {
  if (amount == null || !currency) return null;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

function formatDealLabel(deal) {
  const dealType = deal?.deal_reference?.deal_type;
  const expiresAt = deal?.deal_reference?.expires_at;
  let prefix;
  if (dealType === 'short_dated' && expiresAt) {
    prefix = `DLC ${dateFmt.format(new Date(expiresAt))}`;
  } else if (dealType === 'damaged_packaging') {
    prefix = 'Emballage abîmé';
  } else {
    prefix = 'Deal';
  }
  const priceRaw = deal?.variants?.[0]?.calculated_price ?? deal?.variants?.[0]?.prices?.[0];
  const amount = priceRaw?.calculated_amount ?? priceRaw?.amount;
  const currency = priceRaw?.currency_code;
  const price = formatPrice(amount, currency);
  const parts = [prefix, deal?.title ?? deal?.handle ?? deal?.deal_reference?.id];
  if (price) parts.push(price);
  return parts.join(' - ');
}

async function fetchDealsByQuery(query) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('limit', '50');
  const res = await fetch(`${MEDUSA_URL}/store/deals?${params.toString()}`, {
    headers: MEDUSA_PUBLISHABLE_KEY
      ? { 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY }
      : {},
  });
  if (!res.ok) throw new Error(`Medusa /store/deals failed: ${res.status}`);
  const json = await res.json();
  return json.deals ?? [];
}

async function fetchDealById(id) {
  if (!id) return null;
  const res = await fetch(`${MEDUSA_URL}/store/deals?ids=${encodeURIComponent(id)}`, {
    headers: MEDUSA_PUBLISHABLE_KEY
      ? { 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY }
      : {},
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.deals?.[0] ?? null;
}

const DealPickerInput = (props) => {
  const {
    attribute,
    name,
    onChange,
    value,
    intlLabel,
    error,
    required,
    description,
    labelAction,
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const debounceRef = useRef(null);

  // Initial: if there's a value, resolve the deal to show its label.
  useEffect(() => {
    if (value && !selectedDeal) {
      fetchDealById(value)
        .then((d) => {
          if (d) setSelectedDeal(d);
        })
        .catch(() => {});
    }
    if (!value && selectedDeal) setSelectedDeal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Search: debounce ~250ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setFetchError(null);
      fetchDealsByQuery(searchQuery)
        .then((d) => setDeals(d))
        .catch((err) => setFetchError(err.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const options = useMemo(() => {
    const out = deals.map((d) => ({
      value: d.deal_reference?.id,
      label: formatDealLabel(d),
    }));
    // Make sure the currently-selected deal is in the list (even if not in search results)
    if (
      selectedDeal &&
      selectedDeal.deal_reference?.id &&
      !out.some((o) => o.value === selectedDeal.deal_reference.id)
    ) {
      out.unshift({
        value: selectedDeal.deal_reference.id,
        label: formatDealLabel(selectedDeal),
      });
    }
    return out;
  }, [deals, selectedDeal]);

  const handleChange = (nextValue) => {
    onChange({ target: { name, value: nextValue ?? '', type: attribute.type } });
    const match = deals.find((d) => d.deal_reference?.id === nextValue);
    if (match) setSelectedDeal(match);
  };

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
        value={value || ''}
        onChange={handleChange}
        onInputChange={(e) => setSearchQuery(e.target.value)}
        autocomplete="none"
        loading={loading}
        loadingMessage="Chargement…"
        noOptionsMessage={() => (fetchError ? `Erreur : ${fetchError}` : 'Aucun deal trouvé')}
        placeholder="Rechercher un deal (DLC / produit)…"
      >
        {options.map((opt) => (
          <ComboboxOption key={opt.value} value={opt.value}>
            {opt.label}
          </ComboboxOption>
        ))}
      </Combobox>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export default DealPickerInput;
