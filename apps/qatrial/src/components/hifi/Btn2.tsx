import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** `bg-muted` chez Grace → `bg-surface-hover`, son équivalent dans les tokens QAtrial. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-a-500 text-white hover:bg-a-600 active:bg-a-700 shadow-sh1',
  secondary:
    'bg-card text-n-800 border border-border hover:bg-surface-hover active:bg-n-100',
  ghost: 'bg-transparent text-n-700 hover:bg-surface-hover',
  danger: 'bg-bad text-white hover:brightness-95',
};

interface Btn2Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Btn2 = forwardRef<HTMLButtonElement, Btn2Props>(
  ({ variant = 'primary', leading, trailing, children, className = '', ...rest }, ref) => (
    <button
      ref={ref}
      className={[
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-r2 px-3 text-hifi-btn transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  ),
);
Btn2.displayName = 'Btn2';
