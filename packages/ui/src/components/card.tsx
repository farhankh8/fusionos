/**
 * FusionOS Card component.
 *
 * Used for grouping related content. Supports header, body, and footer sections.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}
    {...props}
  />
));

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-b border-gray-200 px-6 py-4', className)} {...props} />
  ),
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
  ),
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-t border-gray-200 px-6 py-4', className)}
      {...props}
    />
  ),
);

CardFooter.displayName = 'CardFooter';
