const config = {
  locales: ['fr'],
};

const bootstrap = () => {};

export default {
  config,
  register(app) {
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
  },
  bootstrap,
};
