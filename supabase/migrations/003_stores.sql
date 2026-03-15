CREATE TYPE store_type AS ENUM ('retail', 'individual');

CREATE TABLE stores (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          UUID          NOT NULL REFERENCES users(id),
  type              store_type    NOT NULL DEFAULT 'retail',
  name              TEXT          NOT NULL,
  description       TEXT,
  logo_url          TEXT,
  address           JSONB         NOT NULL,
  lat               DOUBLE PRECISION NOT NULL,
  lng               DOUBLE PRECISION NOT NULL,
  -- PostGIS geography column for spatial queries
  location          GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
                      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
                    ) STORED,
  phone             TEXT,
  email             TEXT,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  stripe_account_id TEXT,
  algolia_object_id TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_stores_owner ON stores(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stores_location ON stores USING GIST(location) WHERE deleted_at IS NULL;
CREATE INDEX idx_stores_active ON stores(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE stores IS 'Both retail hardware stores and individual C2C sellers';
COMMENT ON COLUMN stores.location IS 'PostGIS geography — use ST_DWithin for radius queries, never JS distance';
