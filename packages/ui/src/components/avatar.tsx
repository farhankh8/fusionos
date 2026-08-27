/**
 * FusionOS Avatar component.
 *
 * Displays user initials or an image with fallback.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

const avatarSizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

type AvatarSize = keyof typeof avatarSizes;

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, initials, size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100',
          avatarSizes[size],
          className,
        )}
        aria-label={alt}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? ''}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-medium text-gray-600">
            {initials ?? '?'}
          </span>
        )}
      </div>
    );
  },
);

Avatar.displayName = 'Avatar';
