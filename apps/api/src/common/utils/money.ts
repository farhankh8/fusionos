/**
 * FusionOS Money Engine
 *
 * Shared deterministic money operations using INTEGER minor units.
 * Never uses floating-point for financial calculations.
 *
 * Representation:
 *   - All amounts stored as integers (minor units, e.g., cents)
 *   - Currency stored as ISO 4217 3-letter code
 *   - Example: AED 1,250.50 → { amount: 125050, currency: 'AED' }
 *
 * Rounding:
 *   - Uses configurable rounding mode from PayrollPolicy
 *   - HALF_UP is the default (banker's rounding)
 *   - Only rounds at the final stage, not intermediate calculations
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type RoundingMode = 'HALF_UP' | 'HALF_DOWN' | 'HALF_EVEN' | 'CEIL' | 'FLOOR';

export interface Money {
  amount: number; // Integer minor units
  currency: string; // ISO 4217
}

// ── Core Operations ────────────────────────────────────────────────────────

/**
 * Add two money amounts. Both must have the same currency.
 */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

/**
 * Subtract b from a. Both must have the same currency.
 */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

/**
 * Multiply a money amount by a numeric factor.
 * The factor is NOT in minor units — it's a plain number.
 */
export function multiplyMoney(a: Money, factor: number): Money {
  return { amount: Math.round(a.amount * factor), currency: a.currency };
}

/**
 * Calculate percentage of a money amount.
 * @param base The base amount
 * @param percent The percentage (e.g., 150 for 150%)
 */
export function percentMoney(base: Money, percent: number): Money {
  return { amount: Math.round((base.amount * percent) / 100), currency: base.currency };
}

/**
 * Divide a money amount by a divisor.
 * Rounds using the specified mode.
 */
export function divideMoney(a: Money, divisor: number, mode: RoundingMode = 'HALF_UP'): Money {
  if (divisor === 0) {
    throw new Error('Cannot divide money by zero');
  }
  const raw = a.amount / divisor;
  return { amount: roundAmount(raw, mode), currency: a.currency };
}

/**
 * Calculate per-day rate from a monthly amount.
 * Uses the provided divisor (typically 22 for monthly).
 */
export function perDayRate(monthlyAmount: Money, daysPerMonth: number, mode: RoundingMode = 'HALF_UP'): Money {
  return divideMoney(monthlyAmount, daysPerMonth, mode);
}

/**
 * Calculate per-hour rate from a daily rate.
 * Uses 8 hours as standard workday.
 */
export function perHourRate(dailyRate: Money, hoursPerDay: number = 8, mode: RoundingMode = 'HALF_UP'): Money {
  return divideMoney(dailyRate, hoursPerDay, mode);
}

/**
 * Calculate per-minute rate from an hourly rate.
 */
export function perMinuteRate(hourlyRate: Money, mode: RoundingMode = 'HALF_UP'): Money {
  return divideMoney(hourlyRate, 60, mode);
}

// ── Rounding ───────────────────────────────────────────────────────────────

/**
 * Round a raw number to an integer using the specified mode.
 * Only used at the FINAL stage — never on intermediate values.
 */
export function roundAmount(amount: number, mode: RoundingMode = 'HALF_UP'): number {
  switch (mode) {
    case 'HALF_UP':
      return Math.round(amount);
    case 'HALF_DOWN': {
      const floor = Math.floor(amount);
      const ceil = Math.ceil(amount);
      const diff = amount - floor;
      if (diff === 0.5) return floor; // Round down on exactly 0.5
      return Math.round(amount);
    }
    case 'HALF_EVEN': {
      // Banker's rounding: round to nearest even number on ties
      const floor = Math.floor(amount);
      const ceil = Math.ceil(amount);
      const diff = amount - floor;
      if (diff === 0.5) {
        return floor % 2 === 0 ? floor : ceil;
      }
      return Math.round(amount);
    }
    case 'CEIL':
      return Math.ceil(amount);
    case 'FLOOR':
      return Math.floor(amount);
    default:
      return Math.round(amount);
  }
}

/**
 * Parse a RoundingMode string safely, defaulting to HALF_UP.
 */
export function parseRoundingMode(mode?: string): RoundingMode {
  const valid: RoundingMode[] = ['HALF_UP', 'HALF_DOWN', 'HALF_EVEN', 'CEIL', 'FLOOR'];
  if (mode && valid.includes(mode as RoundingMode)) {
    return mode as RoundingMode;
  }
  return 'HALF_UP';
}

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate that a money amount is non-negative.
 */
export function assertNonNegative(amount: Money, context?: string): void {
  if (amount.amount < 0) {
    throw new Error(`Money amount must be non-negative${context ? ` (${context})` : ''}: ${amount.amount}`);
  }
}

/**
 * Validate that two money amounts have the same currency.
 */
function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

// ── Formatting ─────────────────────────────────────────────────────────────

/**
 * Format a money amount for display.
 * Converts from minor units to major units.
 */
export function formatMoney(amount: Money): string {
  const majorUnits = amount.amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: amount.currency,
    minimumFractionDigits: 2,
  }).format(majorUnits);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create a Money object from a major unit amount (e.g., 30000 for $300.00).
 */
export function moneyFromMajorUnits(majorUnits: number, currency: string): Money {
  return { amount: Math.round(majorUnits * 100), currency };
}

/**
 * Create a Money object from minor units directly.
 */
export function moneyFromMinorUnits(minorUnits: number, currency: string): Money {
  return { amount: minorUnits, currency };
}
