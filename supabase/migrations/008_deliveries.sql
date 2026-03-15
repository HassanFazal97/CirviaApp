CREATE TYPE delivery_status AS ENUM (
  'pending',
  'assigned',
  'en_route_to_store',
  'at_store',
  'picked_up',
  'in_transit',
  'delivered',
  'failed'
);

CREATE TABLE deliveries (
  id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID            NOT NULL UNIQUE REFERENCES orders(id),
  driver_id         UUID            REFERENCES drivers(id),
  status            delivery_status NOT NULL DEFAULT 'pending',
  pickup_address    JSONB           NOT NULL,
  dropoff_address   JSONB           NOT NULL,
  distance_km       DOUBLE PRECISION,
  driver_fee_cents  INTEGER         NOT NULL CHECK (driver_fee_cents >= 0),
  proof_photo_url   TEXT,
  pickup_at         TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);

COMMENT ON TABLE deliveries IS 'Tracks physical delivery — one per order';
