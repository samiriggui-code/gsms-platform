import { useTranslation } from 'react-i18next';
import type { RequirementStatus, TestStatus } from '../../types';
import { Pill } from '../hifi';

type PillVariant = 'default' | 'accent' | 'outline' | 'ok' | 'warn' | 'bad' | 'info';

const REQ_VARIANTS: Record<RequirementStatus, PillVariant> = {
  Draft: 'default',
  Active: 'info',
  Closed: 'ok',
};

const TEST_VARIANTS: Record<TestStatus, PillVariant> = {
  'Not Run': 'default',
  Passed: 'ok',
  Failed: 'bad',
};

interface Props {
  status: RequirementStatus | TestStatus;
  type: 'requirement' | 'test';
}

export function StatusBadge({ status, type }: Props) {
  const { t } = useTranslation();
  const variant = type === 'requirement'
    ? REQ_VARIANTS[status as RequirementStatus]
    : TEST_VARIANTS[status as TestStatus];

  return (
    <Pill variant={variant}>
      {t(`statuses.${status}`)}
    </Pill>
  );
}
