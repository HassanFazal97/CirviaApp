// ─── Currency Utilities ───────────────────────────────────────────────────────

/** Format cents to display string (e.g. 1999 → "$19.99") */
export function formatCents(cents: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/** Convert dollar amount (string or number) to cents */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Calculate payout splits from order total (returns cents) */
export function calculatePayoutSplits(totalCents: number): {
  platform: number;
  driver: number;
  store: number;
} {
  const platform = Math.round(totalCents * 0.15);
  const driver = Math.round(totalCents * 0.20);
  const store = totalCents - platform - driver;
  return { platform, driver, store };
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s\-().]/g, ''));
}

export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function nowISO(): string {
  return new Date().toISOString();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ─── Construction Material Helpers ───────────────────────────────────────────

/** Estimate tiles needed for a room (adds 10% waste factor) */
export function estimateTileQuantity(
  roomSqFt: number,
  tileSqFt: number,
  wasteFactor = 0.1
): number {
  return Math.ceil((roomSqFt * (1 + wasteFactor)) / tileSqFt);
}

/** Estimate drywall sheets needed (4x8 standard, adds 15% waste) */
export function estimateDrywallSheets(
  wallSqFt: number,
  sheetSqFt = 32,
  wasteFactor = 0.15
): number {
  return Math.ceil((wallSqFt * (1 + wasteFactor)) / sheetSqFt);
}

// ─── Geo Utilities ────────────────────────────────────────────────────────────

/** Haversine distance in km (used for display only — DB uses PostGIS ST_DWithin) */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
