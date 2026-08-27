/**
 * UI utility functions for FusionOS design system.
 */

import { type ClassValue, clsx } from 'clsx';

/**
 * Merge class names with clsx.
 * This is the primary utility for conditional Tailwind classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
