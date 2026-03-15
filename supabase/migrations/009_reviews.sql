CREATE TYPE review_target_type AS ENUM ('store', 'driver');

CREATE TABLE reviews (
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID                NOT NULL REFERENCES orders(id),
  reviewer_id   UUID                NOT NULL REFERENCES users(id),
  target_type   review_target_type  NOT NULL,
  target_id     UUID                NOT NULL,
  rating        SMALLINT            NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- One review per (order, target_type) pair — buyer can rate store + driver separately
CREATE UNIQUE INDEX idx_reviews_unique ON reviews(order_id, reviewer_id, target_type);
CREATE INDEX idx_reviews_target ON reviews(target_type, target_id);

COMMENT ON TABLE reviews IS 'Post-delivery ratings — buyer rates store and driver';
