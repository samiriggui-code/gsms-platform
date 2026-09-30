import { MenuCardsGrid } from '../components/hub/MenuCard';
import { APP_SECTION_CARDS } from '../navigation/hub-config';

/** Accueil : cards = sections du 1er palier (alignées sur la sidebar). */
export function AccueilPage() {
  return (
    <MenuCardsGrid
      title="Accueil"
      subtitle="Choisissez une section — même entrées que la barre latérale."
      cards={APP_SECTION_CARDS}
    />
  );
}
