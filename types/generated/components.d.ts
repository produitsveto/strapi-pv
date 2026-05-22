import type { Schema, Struct } from '@strapi/strapi';

export interface DealsFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_deals_faq_items';
  info: {
    displayName: 'FAQ Item';
    icon: 'question-circle';
  };
  attributes: {
    answer: Schema.Attribute.RichText & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DealsFeaturedProduct extends Struct.ComponentSchema {
  collectionName: 'components_deals_featured_products';
  info: {
    description: 'Produit mis en avant sur une page entit\u00E9';
    displayName: 'Featured Product';
    icon: 'star';
  };
  attributes: {
    highlightText: Schema.Attribute.String;
    productHandle: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DealsHeroProduct extends Struct.ComponentSchema {
  collectionName: 'components_deals_hero_products';
  info: {
    displayName: 'Hero Product';
    icon: 'star';
  };
  attributes: {
    dealRefId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.CustomField<'global::deal-ref'>;
    highlightText: Schema.Attribute.String;
  };
}

export interface DealsHeroStat extends Struct.ComponentSchema {
  collectionName: 'components_deals_hero_stats';
  info: {
    displayName: 'Hero Stat';
    icon: 'chartBubble';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DealsTopBandItem extends Struct.ComponentSchema {
  collectionName: 'components_deals_top_band_items';
  info: {
    displayName: 'Top Band Item';
    icon: 'bulletList';
  };
  attributes: {
    link: Schema.Attribute.String;
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DealsTrustBadge extends Struct.ComponentSchema {
  collectionName: 'components_deals_trust_badges';
  info: {
    displayName: 'Trust Badge';
    icon: 'shield-alt';
  };
  attributes: {
    icon: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DealsWhyThisPriceItem extends Struct.ComponentSchema {
  collectionName: 'components_deals_why_this_price_items';
  info: {
    displayName: 'Why This Price Item';
    icon: 'info-circle';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    icon: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedKnowledgeArea extends Struct.ComponentSchema {
  collectionName: 'components_shared_knowledge_areas';
  info: {
    displayName: 'Knowledge Area';
    icon: 'tag';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'image';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'> &
      Schema.Attribute.Required;
  };
}

export interface SharedPerson extends Struct.ComponentSchema {
  collectionName: 'components_shared_persons';
  info: {
    displayName: 'Person';
    icon: 'user';
  };
  attributes: {
    jobTitle: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedPostalAddress extends Struct.ComponentSchema {
  collectionName: 'components_shared_postal_addresses';
  info: {
    displayName: 'Postal Address';
    icon: 'map-marker-alt';
  };
  attributes: {
    addressCountry: Schema.Attribute.String & Schema.Attribute.DefaultTo<'FR'>;
    addressLocality: Schema.Attribute.String;
    addressRegion: Schema.Attribute.String;
    postalCode: Schema.Attribute.String;
    streetAddress: Schema.Attribute.String;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'quote-right';
  };
  attributes: {
    body: Schema.Attribute.RichText & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    displayName: 'Rich Text';
    icon: 'align-left';
  };
  attributes: {
    body: Schema.Attribute.RichText & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    h1: Schema.Attribute.String;
    keyword: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    noIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    displayName: 'Slider';
    icon: 'images';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_social_links';
  info: {
    displayName: 'Social Link';
    icon: 'share-alt';
  };
  attributes: {
    platform: Schema.Attribute.Enumeration<
      [
        'facebook',
        'instagram',
        'youtube',
        'linkedin',
        'tiktok',
        'x',
        'pinterest',
        'other',
      ]
    >;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'deals.faq-item': DealsFaqItem;
      'deals.featured-product': DealsFeaturedProduct;
      'deals.hero-product': DealsHeroProduct;
      'deals.hero-stat': DealsHeroStat;
      'deals.top-band-item': DealsTopBandItem;
      'deals.trust-badge': DealsTrustBadge;
      'deals.why-this-price-item': DealsWhyThisPriceItem;
      'shared.knowledge-area': SharedKnowledgeArea;
      'shared.media': SharedMedia;
      'shared.person': SharedPerson;
      'shared.postal-address': SharedPostalAddress;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'shared.social-link': SharedSocialLink;
    }
  }
}
