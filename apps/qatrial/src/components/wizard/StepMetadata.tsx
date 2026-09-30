import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

interface MetaData {
  name: string;
  description: string;
  owner: string;
  version: string;
}

interface Props {
  meta: MetaData;
  onChange: (meta: MetaData) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepMetadata({ meta, onChange, onBack, onNext }: Props) {
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meta.name.trim()) return;
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-text-primary">{t('wizard.projectInfo')}</h2>
        <p className="mb-4 text-sm text-text-tertiary">{t('wizard.projectInfoDesc')}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wizard-project-name">{t('wizard.projectName')} *</Label>
        <Input
          id="wizard-project-name"
          type="text"
          value={meta.name}
          onChange={(e) => onChange({ ...meta, name: e.target.value })}
          placeholder={t('wizard.projectNamePlaceholder')}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wizard-project-description">{t('wizard.description')}</Label>
        <Textarea
          id="wizard-project-description"
          value={meta.description}
          onChange={(e) => onChange({ ...meta, description: e.target.value })}
          rows={2}
          placeholder={t('wizard.descriptionPlaceholder')}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wizard-project-owner">{t('wizard.owner')}</Label>
          <Input
            id="wizard-project-owner"
            type="text"
            value={meta.owner}
            onChange={(e) => onChange({ ...meta, owner: e.target.value })}
            placeholder={t('wizard.ownerPlaceholder')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wizard-project-version">{t('wizard.version')}</Label>
          <Input
            id="wizard-project-version"
            type="text"
            value={meta.version}
            onChange={(e) => onChange({ ...meta, version: e.target.value })}
            placeholder="1.0"
          />
        </div>
      </div>
      <div className="flex justify-between pt-4">
        <Button type="button" variant="secondary" onClick={onBack}>
          {t('common.back')}
        </Button>
        <Button type="submit" disabled={!meta.name.trim()}>
          {t('common.next')}
        </Button>
      </div>
    </form>
  );
}
