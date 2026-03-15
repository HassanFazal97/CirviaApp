CREATE TYPE product_condition AS ENUM ('new', 'used', 'excess');

CREATE TABLE products (
  id                UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID              NOT NULL REFERENCES stores(id),
  name              TEXT              NOT NULL,
  description       TEXT,
  sku               TEXT,
  category          TEXT              NOT NULL,
  unit              TEXT              NOT NULL DEFAULT 'each',
  price_cents       INTEGER           NOT NULL CHECK (price_cents > 0),
  stock             INTEGER           NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_urls        JSONB             NOT NULL DEFAULT '[]',
  weight_kg         DOUBLE PRECISION,
  condition         product_condition NOT NULL DEFAULT 'new',
  is_active         BOOLEAN           NOT NULL DEFAULT true,
  algolia_object_id TEXT,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_products_store ON products(store_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_active ON products(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE products IS 'Product catalog for all stores — price always in cents';
