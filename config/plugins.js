module.exports = () => ({
  // PV-60 — panneau « Traductions » du Content Manager : état par langue et
  // relance de ce qui en a besoin. Plugin local, livré avec l'application.
  translation: {
    enabled: true,
    resolve: './src/plugins/translation',
  },
});
