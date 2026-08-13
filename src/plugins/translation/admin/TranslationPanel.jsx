import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Flex, Link, Loader, Status, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

/**
 * PV-60 — panneau « Traductions » du Content Manager.
 *
 * Montre, langue par langue, ce qui est à jour, ce qui est devenu obsolète
 * parce que le français a changé, ce qui a été corrigé à la main — et donc
 * protégé — et ce qui reste à générer. Un bouton relance uniquement les deux
 * cas qui le demandent.
 *
 * La traduction ne se fait pas ici : le bouton demande son exécution, et
 * celle-ci prend plusieurs minutes. Le panneau surveille donc l'avancement et
 * rafraîchit l'état tout seul, pour qu'un clic ne reste pas sans réponse
 * visible. Fermer la page n'interrompt rien.
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

/** Rythme de surveillance : assez fréquent pour suivre, assez rare pour ne pas peser. */
const POLL_MS = 15000;
/** Au-delà, on cesse de surveiller : le traitement a largement eu le temps d'aboutir. */
const POLL_MAX_MS = 20 * 60 * 1000;

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
  const [progress, setProgress] = useState(null);
  const startedAt = useRef(null);

  const refresh = useCallback(async () => {
    if (!documentId) return null;
    try {
      const { data } = await get(`/translation/status/${model}/${documentId}`);
      setStatus(data);
      return data;
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? 'État des traductions indisponible.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [get, model, documentId]);

  useEffect(() => {
    refresh();
  }, [refresh, document?.updatedAt]);

  // Surveillance de l'exécution en cours : l'état des traductions est la vérité
  // finale, l'exécution ne sert qu'à dire où on en est et à signaler un échec.
  useEffect(() => {
    if (!running) return undefined;

    const timer = setInterval(async () => {
      if (Date.now() - startedAt.current > POLL_MAX_MS) {
        setRunning(false);
        return;
      }

      const [état, exécution] = await Promise.all([
        refresh(),
        get('/translation/last-run')
          .then((r) => r.data?.run ?? null)
          .catch(() => null),
      ]);

      if (exécution) setProgress(exécution);

      const terminé = exécution && exécution.status === 'completed';
      const plusRien = état?.available && état.locales.every((l) => l.todo === 0);
      if (terminé || plusRien) setRunning(false);
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [running, refresh, get]);

  const run = async () => {
    setError(null);
    setProgress(null);
    try {
      await post(`/translation/run/${model}/${documentId}`, {});
      startedAt.current = Date.now();
      setRunning(true);
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? 'La traduction n’a pas pu être lancée.');
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
    const échec = progress?.status === 'completed' && progress.conclusion !== 'success';

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

        {running && (
          <Typography variant="pi" textColor="neutral600">
            Traduction en cours — quelques minutes. Tu peux fermer cette page.
          </Typography>
        )}

        {échec && (
          <Typography variant="pi" textColor="danger600">
            La dernière exécution a échoué.{' '}
            {progress.url && (
              <Link href={progress.url} isExternal>
                Voir le détail
              </Link>
            )}
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
