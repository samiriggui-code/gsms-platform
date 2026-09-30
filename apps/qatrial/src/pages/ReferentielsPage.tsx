import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MenuCardsGrid } from '../components/hub/MenuCard';
import { HOME_PATH, REFERENTIELS_CARDS } from '../navigation/hub-config';

/** Compat route /app/referentiels — redirige l’esprit vers Accueil. */
export function ReferentielsPage() {
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
        title="Référentiels"
        subtitle="Même contenu que sur l’Accueil — catalogues partagés."
        cards={REFERENTIELS_CARDS}
      />
    </div>
  );
}
