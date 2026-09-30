import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  Btn2,
} from '../hifi';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger-subtle">
            <AlertTriangle className="size-4 text-danger" />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{message}</p>
          </div>
        </div>
        <DialogFooter>
          <Btn2 variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Btn2>
          <Btn2 variant="danger" onClick={onConfirm}>
            {t('common.delete')}
          </Btn2>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
