import { Toaster as SonnerToaster } from 'sonner';

export { toast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group rounded-xl border border-border bg-surface-elevated text-text-primary shadow-lg',
          description: 'text-text-secondary',
          actionButton: 'bg-accent text-white',
          cancelButton: 'bg-surface-tertiary text-text-secondary',
          closeButton: 'border-border bg-surface text-text-tertiary',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-danger',
          warning: '[&_[data-icon]]:text-warning',
        },
      }}
    />
  );
}
