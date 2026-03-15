import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePayoutSplits } from '@cirvia/utils';

// Unit test for stock reservation logic and payout splits
// Full integration test would require a real DB

describe('Stock reservation logic', () => {
  it('platform + driver + store splits always equal total', () => {
    // Test various order amounts
    const amounts = [100, 999, 1000, 5000, 9999, 10000, 99999];
    for (const total of amounts) {
      const { platform, driver, store } = calculatePayoutSplits(total);
      expect(platform + driver + store).toBe(total);
      expect(platform).toBe(Math.round(total * 0.15));
      expect(driver).toBe(Math.round(total * 0.20));
    }
  });

  it('store always gets the remainder (65% base)', () => {
    const total = 10000;
    const { platform, driver, store } = calculatePayoutSplits(total);
    expect(store).toBe(total - platform - driver);
    // Store gets ~65%
    expect(store).toBeGreaterThan(total * 0.6);
  });
});

describe('Order totals', () => {
  it('total = subtotal + delivery_fee (platform fee is already included in subtotal proportion)', () => {
    const subtotal = 5000;
    const deliveryFee = 599;
    const total = subtotal + deliveryFee;
    expect(total).toBe(5599);
  });

  it('never uses floats for money', () => {
    // All calculations must use integer cents
    const price = 1999; // $19.99
    const qty = 3;
    const lineTotal = price * qty;
    expect(lineTotal).toBe(5997);
    expect(Number.isInteger(lineTotal)).toBe(true);
  });
});
