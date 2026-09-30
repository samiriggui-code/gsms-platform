import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-r2 text-[12.5px] font-medium tracking-[-0.011em] transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover',
        secondary: 'border border-border bg-surface text-text-secondary hover:bg-surface-hover',
        outline: 'border border-border bg-transparent text-text-primary hover:bg-surface-hover',
        ghost: 'text-text-tertiary hover:bg-surface-hover hover:text-text-secondary',
        destructive: 'bg-danger text-white hover:bg-danger-hover',
        link: 'text-accent-text underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2.5 text-[11.5px]',
        lg: 'h-10 px-4 text-[13px]',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
