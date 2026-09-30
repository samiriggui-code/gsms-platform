import { useTranslation } from 'react-i18next';
import {
  ScrollText, PenTool, ShieldCheck, GitBranch, AlertTriangle,
  FileWarning, GraduationCap, Building2, MessageSquareWarning,
  BarChart3, FileText, DatabaseBackup, Lock, ClipboardCheck, Link2,
} from 'lucide-react';
import { MODULE_DEFINITIONS } from '../../templates/registry';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

/** Map icon name from registry to actual lucide component */
const ICON_MAP: Record<string, React.ReactNode> = {
  ScrollText: <ScrollText className="w-4 h-4" />,
  PenTool: <PenTool className="w-4 h-4" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  GitBranch: <GitBranch className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  FileWarning: <FileWarning className="w-4 h-4" />,
  GraduationCap: <GraduationCap className="w-4 h-4" />,
  Building2: <Building2 className="w-4 h-4" />,
  MessageSquareWarning: <MessageSquareWarning className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  DatabaseBackup: <DatabaseBackup className="w-4 h-4" />,
  Lock: <Lock className="w-4 h-4" />,
  ClipboardCheck: <ClipboardCheck className="w-4 h-4" />,
  Link2: <Link2 className="w-4 h-4" />,
};

export function StepModules({ selected, onToggle, onBack, onNext }: Props) {
  const { t } = useTranslation();

  const allModuleIds = MODULE_DEFINITIONS.map((m) => m.id);
  const allSelected = allModuleIds.length > 0 && allModuleIds.every((id) => selected.includes(id));

  const handleToggleAll = () => {
    if (allSelected) {
      // Deselect all — toggle each selected module off
      allModuleIds.forEach((id) => {
        if (selected.includes(id)) onToggle(id);
      });
    } else {
      // Select all — toggle each unselected module on
      allModuleIds.forEach((id) => {
        if (!selected.includes(id)) onToggle(id);
      });
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary mb-1">{t('wizard.selectModules')}</h2>
        <p className="text-sm text-text-tertiary">{t('wizard.selectModulesDesc')}</p>
      </div>

      <div className="mb-2 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={handleToggleAll} className="text-accent-text hover:bg-accent-subtle">
          {allSelected ? t('wizard.deselectAll') : t('wizard.selectAll')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
        {MODULE_DEFINITIONS.map((mod) => {
          const isChecked = selected.includes(mod.id);
          const reqCount = mod.requirements.length;
          const testCount = mod.tests.length;
          return (
            <label
              key={mod.id}
              className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                isChecked
                  ? 'border-accent bg-accent-subtle'
                  : 'border-border hover:border-text-tertiary bg-surface'
              }`}
            >
              <Checkbox checked={isChecked} onCheckedChange={() => onToggle(mod.id)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`${isChecked ? 'text-accent' : 'text-text-tertiary'}`}>
                    {ICON_MAP[mod.icon] ?? <ShieldCheck className="w-4 h-4" />}
                  </span>
                  <span className={`text-sm font-medium ${isChecked ? 'text-accent-text' : 'text-text-primary'}`}>
                    {t(mod.nameKey)}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{t(mod.descKey)}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded bg-surface-tertiary text-text-secondary">
                  {reqCount} reqs + {testCount} tests
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-6">
        <Button type="button" variant="secondary" onClick={onBack}>
          {t('common.back')}
        </Button>
        <span className="text-xs text-text-tertiary">
          {t('wizard.modulesSelected', { count: selected.length })}
        </span>
        <Button type="button" onClick={onNext}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
}
