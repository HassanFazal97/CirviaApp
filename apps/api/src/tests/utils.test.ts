import { describe, it, expect } from 'vitest';
import { calculatePayoutSplits, formatCents, toCents } from '@cirvia/utils';

describe('calculatePayoutSplits', () => {
  it('splits correctly for $100 order', () => {
    const splits = calculatePayoutSplits(10000);
    expect(splits.platform).toBe(1500); // 15%
    expect(splits.driver).toBe(2000);   // 20%
    expect(splits.store).toBe(6500);    // 65%
    expect(splits.platform + splits.driver + splits.store).toBe(10000);
  });

  it('splits always sum to total', () => {
    // Test with an odd number to verify rounding
    const total = 9999;
    const splits = calculatePayoutSplits(total);
    expect(splits.platform + splits.driver + splits.store).toBe(total);
  });

  it('returns integers (cents, never floats)', () => {
    const splits = calculatePayoutSplits(1337);
    expect(Number.isInteger(splits.platform)).toBe(true);
    expect(Number.isInteger(splits.driver)).toBe(true);
    expect(Number.isInteger(splits.store)).toBe(true);
  });
});

describe('formatCents', () => {
  it('formats cents to USD string', () => {
    expect(formatCents(1999)).toBe('$19.99');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(100)).toBe('$1.00');
  });
});

describe('toCents', () => {
  it('converts dollars to cents', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(1)).toBe(100);
  });
});
