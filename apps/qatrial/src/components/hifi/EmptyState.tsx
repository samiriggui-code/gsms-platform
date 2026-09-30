/**
 * EmptyState hifi — zone vide sobre (landing).
 */
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Card } from './Card';
import { Btn2 } from './Btn2';
import { cn } from '../../lib/cn';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-r3 bg-accent-subtle text-accent">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <p className="text-hifi-title text-text-primary">{title}</p>
      {description ? (
        <p className="max-w-md text-hifi-sub text-text-tertiary">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Btn2 variant="primary" onClick={onAction}>
          {actionLabel}
        </Btn2>
      ) : null}
    </Card>
  );
}
