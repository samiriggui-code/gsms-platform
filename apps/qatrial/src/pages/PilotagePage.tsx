import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MenuCardsGrid } from '../components/hub/MenuCard';
import { HOME_PATH, PILOTAGE_CARDS } from '../navigation/hub-config';

export function PilotagePage() {
  return (
    <div className="space-y-4">
      <Link
        to={HOME_PATH}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-accent"
      >
        <ArrowLeft className="size-3.5" />
        Accueil
      </Link>
      <MenuCardsGrid
        title="Pilotage"
        subtitle="Tâches et KPI — aussi listés sur l’Accueil."
        cards={PILOTAGE_CARDS}
      />
    </div>
  );
}
