CREATE TABLE order_items (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID        NOT NULL REFERENCES orders(id),
  product_id        UUID        NOT NULL REFERENCES products(id),
  quantity          INTEGER     NOT NULL CHECK (quantity > 0),
  unit_price_cents  INTEGER     NOT NULL CHECK (unit_price_cents > 0),
  total_cents       INTEGER     NOT NULL CHECK (total_cents > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

COMMENT ON TABLE order_items IS 'Snapshot of product price at time of order — immutable';
