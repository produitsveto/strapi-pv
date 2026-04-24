import type { Schema, Struct } from '@strapi/strapi';

export interface DealsBrand extends Struct.ComponentSchema {
  collectionName: 'components_deals_brands';
  info: {
    displayName: 'Brand';
    icon: 'tag';
  };
  attributes: {
    logo: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    slug: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface DealsDiscountBadge extends Struct.ComponentSchema {
  collectionName: 'components_deals_discount_badges';
  info: {
    displayName: 'Discount Badge';
    icon: 'percentage';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    type: Schema.Attribute.Enumeration<['percent', 'amount']> &
      Schema.Attribute.Required;
    value: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

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
    highlightText: Schema.Attribute.String;
    productHandle: Schema.Attribute.String & Schema.Attribute.Required;
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

export interface DealsQuickFilter extends Struct.ComponentSchema {
  collectionName: 'components_deals_quick_filters';
  info: {
    displayName: 'Quick Filter';
    icon: 'filter';
  };
  attributes: {
    color: Schema.Attribute.Enumeration<
      ['red', 'orange', 'yellow', 'green', 'blue']
    > &
      Schema.Attribute.Required;
    description: Schema.Attribute.String;
    filterType: Schema.Attribute.Enumeration<['expiry_months', 'collection']> &
      Schema.Attribute.Required;
    filterValue: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'deals.brand': DealsBrand;
      'deals.discount-badge': DealsDiscountBadge;
      'deals.faq-item': DealsFaqItem;
      'deals.featured-product': DealsFeaturedProduct;
      'deals.hero-product': DealsHeroProduct;
      'deals.hero-stat': DealsHeroStat;
      'deals.quick-filter': DealsQuickFilter;
      'deals.trust-badge': DealsTrustBadge;
      'deals.why-this-price-item': DealsWhyThisPriceItem;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
    }
  }
}
