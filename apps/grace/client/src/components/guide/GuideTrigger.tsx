import { useLocation } from '@tanstack/react-router';
import { HelpCircle } from 'lucide-react';
import { useGuideStore } from '../../stores/guide';
import { routeToGuideId } from '../../content/guides/types';
import { getGuide, hasGuide } from '../../content/guides';
import { useT } from '../../i18n';

export function GuideTrigger() {
  const t = useT();
  const location = useLocation();
  const open = useGuideStore((s) => s.open);

  const guideId = routeToGuideId(location.pathname);
  if (!guideId || !hasGuide(guideId)) return null;

  const guide = getGuide(guideId, t);
  if (!guide) return null;

  return (
    <button
      type="button"
      onClick={() => open(guideId)}
      className="w-9 h-9 flex items-center justify-center text-n-600 hover:text-a-600 hover:bg-n-100 rounded-r2 transition-colors"
      aria-label={t('guide.chrome.open', { title: guide.title })}
      title={t('guide.chrome.titleTip', { title: guide.title })}
    >
      <HelpCircle className="w-[18px] h-[18px]" />
    </button>
  );
}
