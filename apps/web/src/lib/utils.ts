/**
 * FusionOS Web App Utilities
 *
 * Re-exports the cn utility from the shared UI package.
 */

import { type ClassValue, clsx } from 'clsx';

/**
 * Merge class names with clsx.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
