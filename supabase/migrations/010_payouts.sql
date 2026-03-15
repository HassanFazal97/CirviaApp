CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE payout_recipient_type AS ENUM ('store', 'driver');

CREATE TABLE payouts (
  id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type      payout_recipient_type   NOT NULL,
  recipient_id        UUID                    NOT NULL,
  order_id            UUID                    NOT NULL REFERENCES orders(id),
  amount_cents        INTEGER                 NOT NULL CHECK (amount_cents > 0),
  stripe_transfer_id  TEXT                    UNIQUE,
  status              payout_status           NOT NULL DEFAULT 'pending',
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_recipient ON payouts(recipient_type, recipient_id);
CREATE INDEX idx_payouts_order ON payouts(order_id);
CREATE INDEX idx_payouts_status ON payouts(status);

COMMENT ON TABLE payouts IS 'Stripe Connect transfers — split: platform 15%, driver 20%, store 65%';
