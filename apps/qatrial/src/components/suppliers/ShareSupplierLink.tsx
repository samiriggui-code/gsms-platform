import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, X, Copy, Check, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { roleHasPermission } from '../../lib/permissions';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SupplierOption {
  id: string;
  name: string;
}

type ExpiryOption = 30 | 90 | 365;

export function ShareSupplierLink() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const canEdit = roleHasPermission(user?.role, 'canEdit');

  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expiry, setExpiry] = useState<ExpiryOption>(30);
  const [generating, setGenerating] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !canEdit) return null;

  const fetchSuppliers = async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await apiFetch<{ suppliers: any[] }>('/suppliers');
      setSuppliers((data.suppliers || []).map((s: any) => ({ id: s.id, name: s.name })));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suppliers');
    }
  };

  const handleOpen = () => {
    setOpen(true);
    fetchSuppliers();
  };

  const handleGenerate = async () => {
    if (!selectedSupplierId) return;
    setGenerating(true);
    setError(null);
    setPortalUrl(null);

    try {
      const res = await apiFetch<{ portalUrl: string; token: string; expiresAt: string }>(
        '/supplier-portal/create',
        {
          method: 'POST',
          body: JSON.stringify({
            supplierId: selectedSupplierId,
            expiresInDays: expiry,
          }),
        },
      );
      setPortalUrl(res.portalUrl);
      setExpiresAt(res.expiresAt);
    } catch (err: any) {
      setError(err.message || 'Failed to generate portal link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPortalUrl(null);
    setExpiresAt(null);
    setError(null);
    setCopied(false);
    setSelectedSupplierId('');
  };

  const expiryOptions: { value: ExpiryOption; label: string }[] = [
    { value: 30, label: t('supplierPortal.expiry30d') },
    { value: 90, label: t('supplierPortal.expiry90d') },
    { value: 365, label: t('supplierPortal.expiry1y') },
  ];

  return (
    <>
      <Button variant="secondary" onClick={handleOpen}>
        <Link2 className="w-4 h-4" />
        {t('supplierPortal.sharePortal')}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={handleClose}>
          <div
            className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-md mx-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">{t('supplierPortal.sharePortal')}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">{t('supplierPortal.warning')}</p>
              </div>

              {/* Supplier selection */}
              <div>
                <Label htmlFor="share-supplier-select" className="block mb-2 text-text-primary">
                  {t('supplierPortal.selectSupplier')}
                </Label>
                <Select value={selectedSupplierId} onValueChange={(v) => setSelectedSupplierId(v)}>
                  <SelectTrigger id="share-supplier-select" className="w-full">
                    <SelectValue placeholder={t('supplierPortal.selectSupplierPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry selection */}
              <div>
                <Label className="block mb-2 text-text-primary">
                  {t('supplierPortal.expiryLabel')}
                </Label>
                <div className="flex gap-2">
                  {expiryOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiry(opt.value)}
                      variant={expiry === opt.value ? 'default' : 'secondary'}
                      className="flex-1"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              {!portalUrl && (
                <Button onClick={handleGenerate} disabled={generating || !selectedSupplierId} className="w-full">
                  <Link2 className="w-4 h-4" />
                  {generating ? t('common.saving') : t('supplierPortal.generateLink')}
                </Button>
              )}

              {/* Generated URL */}
              {portalUrl && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={portalUrl}
                      readOnly
                      className="flex-1 font-mono text-xs bg-surface-secondary"
                    />
                    <Button onClick={handleCopy} className="shrink-0">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? t('auditMode.copied') : t('auditMode.copyLink')}
                    </Button>
                  </div>
                  {expiresAt && (
                    <p className="text-xs text-text-tertiary">
                      {t('supplierPortal.expiresAt', { date: new Date(expiresAt).toLocaleString() })}
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
