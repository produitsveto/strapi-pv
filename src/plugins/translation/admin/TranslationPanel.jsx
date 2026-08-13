import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Flex, Loader, Status, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

/**
 * PV-60 — panneau « Traductions » du Content Manager.
 *
 * Montre, langue par langue, ce qui est à jour, ce qui est devenu obsolète
 * parce que le français a changé, ce qui a été corrigé à la main — et donc
 * protégé — et ce qui reste à générer. Un bouton relance uniquement les deux
 * premiers cas.
 *
 * L'état est calculé côté serveur : ce composant ne fait que l'afficher. Il
 * n'existe donc aucune règle de traduction ici, et rien à tenir à jour de ce
 * côté quand celles du moteur évoluent.
 */

const LANGUAGES = {
  en: 'Anglais',
  de: 'Allemand',
  it: 'Italien',
  es: 'Espagnol',
  pt: 'Portugais',
  el: 'Grec',
  nl: 'Néerlandais',
  pl: 'Polonais',
};

/**
 * Les quatre situations décrites par le client, plus le cas « à revoir » :
 * une traduction corrigée à la main dont le français a bougé depuis. On la
 * garde — c'est du travail humain — mais on la signale.
 */
const STATES = {
  write: { variant: 'primary', label: 'À générer' },
  refresh: { variant: 'warning', label: 'À mettre à jour' },
  stale: { variant: 'warning', label: 'À revoir' },
  locked: { variant: 'secondary', label: 'Protégée' },
  skip: { variant: 'success', label: 'À jour' },
};

const detail = ({ counts }) => {
  const parts = [];
  if (counts.write) parts.push(`${counts.write} à générer`);
  if (counts.refresh) parts.push(`${counts.refresh} à mettre à jour`);
  if (counts.stale) parts.push(`${counts.stale} à revoir`);
  if (counts.locked) parts.push(`${counts.locked} protégé${counts.locked > 1 ? 's' : ''}`);
  return parts.join(' · ');
};

const TranslationPanel = ({ model, documentId, document }) => {
  const { get, post } = useFetchClient();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const refresh = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await get(`/translation/status/${model}/${documentId}`);
      setStatus(data);
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? 'État des traductions indisponible.');
    } finally {
      setLoading(false);
    }
  }, [get, model, documentId]);

  useEffect(() => {
    refresh();
  }, [refresh, document?.updatedAt]);

  const run = async () => {
    setRunning(true);
    setError(null);
    setDone(null);
    try {
      const { data } = await post(`/translation/run/${model}/${documentId}`, {});
      const total = data.results.reduce((n, r) => n + r.translated, 0);
      const warnings = data.results.flatMap((r) => r.warnings);
      setDone(
        total === 0
          ? 'Tout était déjà à jour.'
          : `${total} traduction${total > 1 ? 's' : ''} mise${total > 1 ? 's' : ''} à jour.` +
              (warnings.length ? ` ${warnings.length} à vérifier.` : '')
      );
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? 'La traduction a échoué.');
    } finally {
      setRunning(false);
    }
  };

  // Rien à afficher tant qu'il n'y a pas de document, ni sur les contenus sans
  // texte traduisible : un panneau vide sur chaque fiche serait du bruit.
  if (!documentId) return null;
  if (status && !status.available) return null;

  const content = (() => {
    if (loading && !status) return <Loader small>Chargement…</Loader>;
    if (error && !status) return <Typography variant="pi">{error}</Typography>;
    if (!status) return null;

    const todo = status.locales.reduce((n, l) => n + l.todo, 0);

    return (
      <Flex direction="column" alignItems="stretch" gap={3}>
        {status.locales.map((entry) => {
          const state = STATES[entry.state] ?? STATES.skip;
          return (
            <Flex key={entry.locale} justifyContent="space-between" alignItems="center" gap={2}>
              <Box>
                <Typography variant="omega" fontWeight="semiBold">
                  {LANGUAGES[entry.locale] ?? entry.locale}
                </Typography>
                <Box>
                  <Typography variant="pi" textColor="neutral600">
                    {detail(entry) || `${status.fields} champs`}
                  </Typography>
                </Box>
              </Box>
              <Status variant={state.variant} size="S">
                <Typography variant="pi">{state.label}</Typography>
              </Status>
            </Flex>
          );
        })}

        <Button onClick={run} loading={running} disabled={running || todo === 0} fullWidth>
          {todo === 0 ? 'Tout est à jour' : `Traduire (${todo} champ${todo > 1 ? 's' : ''})`}
        </Button>

        {done && (
          <Typography variant="pi" textColor="success600">
            {done}
          </Typography>
        )}
        {error && (
          <Typography variant="pi" textColor="danger600">
            {error}
          </Typography>
        )}
        <Typography variant="pi" textColor="neutral600">
          Une traduction corrigée à la main n’est jamais écrasée.
        </Typography>
      </Flex>
    );
  })();

  return { title: 'Traductions', content };
};

export default TranslationPanel;
