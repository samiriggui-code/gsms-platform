import * as React from 'react';
import { cn } from '../../lib/cn';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-9 w-full rounded-r2 border border-input-border bg-input-bg px-2.5 text-[12.5px] tracking-[-0.011em] text-text-primary transition-colors placeholder:text-text-tertiary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
