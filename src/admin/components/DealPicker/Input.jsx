import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Combobox, ComboboxOption } from '@strapi/design-system';

// Strapi Cloud's admin build only injects an allowlist of env vars (ADMIN_PATH,
// STRAPI_ADMIN_BACKEND_URL, STRAPI_TELEMETRY_DISABLED, STRAPI_AI_URL,
// STRAPI_ANALYTICS_URL) — STRAPI_ADMIN_* custom vars are ignored. So we fetch
// the Medusa config from a public Strapi route that reads server-side env vars.
let configPromise = null;
function getMedusaConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/medusa-config', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { url: '', publishableKey: '' }))
      .catch(() => ({ url: '', publishableKey: '' }));
  }
  return configPromise;
}

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
  const { url, publishableKey } = await getMedusaConfig();
  if (!url) throw new Error('Medusa URL not configured');
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('limit', '50');
  const res = await fetch(`${url}/store/deals?${params.toString()}`, {
    headers: publishableKey ? { 'x-publishable-api-key': publishableKey } : {},
  });
  if (!res.ok) throw new Error(`Medusa /store/deals failed: ${res.status}`);
  const json = await res.json();
  return json.deals ?? [];
}

async function fetchDealById(id) {
  if (!id) return null;
  const { url, publishableKey } = await getMedusaConfig();
  if (!url) return null;
  const res = await fetch(`${url}/store/deals?ids=${encodeURIComponent(id)}`, {
    headers: publishableKey ? { 'x-publishable-api-key': publishableKey } : {},
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
    label,
    hint,
    error,
    required,
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const debounceRef = useRef(null);

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
      hint={hint}
      required={required}
    >
      <Field.Label>{label ?? name}</Field.Label>
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
