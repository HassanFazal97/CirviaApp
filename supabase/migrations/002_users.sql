CREATE TYPE user_role AS ENUM ('buyer', 'store_owner', 'driver', 'admin');

CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT          NOT NULL UNIQUE,
  full_name     TEXT          NOT NULL,
  phone         TEXT,
  role          user_role     NOT NULL DEFAULT 'buyer',
  avatar_url    TEXT,
  push_token    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'All platform users across roles';
