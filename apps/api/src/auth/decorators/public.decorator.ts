/**
 * Public decorator — marks a route as publicly accessible (no auth required).
 * Use on routes like login, register, health check.
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
