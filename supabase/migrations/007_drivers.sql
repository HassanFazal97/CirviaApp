CREATE TYPE vehicle_type AS ENUM ('bicycle', 'motorcycle', 'car', 'van', 'truck');
CREATE TYPE driver_status AS ENUM ('offline', 'online', 'on_delivery');

CREATE TABLE drivers (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL UNIQUE REFERENCES users(id),
  vehicle_type      vehicle_type  NOT NULL,
  vehicle_plate     TEXT,
  license_number    TEXT,
  is_verified       BOOLEAN       NOT NULL DEFAULT false,
  status            driver_status NOT NULL DEFAULT 'offline',
  current_lat       DOUBLE PRECISION,
  current_lng       DOUBLE PRECISION,
  stripe_account_id TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_drivers_user ON drivers(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drivers_status ON drivers(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE drivers IS 'Driver profiles linked to users table';
