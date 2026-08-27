/**
 * Common validation schemas for FusionOS.
 *
 * These schemas are used for both frontend form validation and API request validation.
 * Using a single source of truth prevents drift between client and server validation.
 */

import { z } from 'zod';

// ── Identifiers ──────────────────────────────────────────────────────────────

export const UUIDSchema = z.string().uuid();

export const TenantIdSchema = z.string().min(1, 'Tenant ID is required');

// ── Strings ──────────────────────────────────────────────────────────────────

export const NonEmptyStringSchema = z.string().min(1, 'This field is required');

export const NameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(255, 'Name must be 255 characters or less');

export const EmailSchema = z.string().email('Invalid email address');

export const PhoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number')
  .optional();

export const CodeSchema = z
  .string()
  .min(1, 'Code is required')
  .max(50, 'Code must be 50 characters or less')
  .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens or underscores');

// ── Address ──────────────────────────────────────────────────────────────────

export const AddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
});

// ── Money ────────────────────────────────────────────────────────────────────

export const CurrencySchema = z
  .string()
  .length(3, 'Currency must be a 3-letter ISO 4217 code')
  .toUpperCase();

export const MoneyAmountSchema = z.object({
  amount: z.number().int().nonnegative('Amount must be a non-negative integer'),
  currency: CurrencySchema,
});

// ── Date/Time ────────────────────────────────────────────────────────────────

export const ISODateSchema = z.string().datetime({ offset: true }).or(z.string().date());

// ── Password ─────────────────────────────────────────────────────────────────

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ── Enum Helpers ─────────────────────────────────────────────────────────────

export function createEnumSchema<T extends readonly [string, ...string[]]>(
  values: T,
  errorMessage?: string,
) {
  return z.enum(values, {
    errorMap: () => ({ message: errorMessage ?? `Must be one of: ${values.join(', ')}` }),
  });
}
