CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'payment_confirmed',
  'store_accepted',
  'preparing',
  'ready_for_pickup',
  'in_transit',
  'delivered',
  'cancelled',
  'refunded'
);

CREATE TABLE orders (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id                  UUID          NOT NULL REFERENCES users(id),
  store_id                  UUID          NOT NULL REFERENCES stores(id),
  status                    order_status  NOT NULL DEFAULT 'pending_payment',
  delivery_address          JSONB         NOT NULL,
  delivery_notes            TEXT,
  subtotal_cents            INTEGER       NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents        INTEGER       NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  platform_fee_cents        INTEGER       NOT NULL CHECK (platform_fee_cents >= 0),
  total_cents               INTEGER       NOT NULL CHECK (total_cents > 0),
  stripe_payment_intent_id  TEXT          UNIQUE,
  stripe_payment_status     TEXT,
  estimated_delivery_at     TIMESTAMPTZ,
  delivered_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_store ON orders(store_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_payment_intent ON orders(stripe_payment_intent_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE orders IS 'One order per store per checkout — amounts always in cents';
