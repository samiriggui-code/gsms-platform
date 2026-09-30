import { useParams } from 'react-router-dom';
import { MenuCardsGrid } from '../components/hub/MenuCard';
import { projectDomainCards } from '../navigation/hub-config';
import { useProjectStore } from '../store/useProjectStore';

export function ProjectHubPage() {
  const { projectId = '' } = useParams();
  const project = useProjectStore((s) => s.project);
  const cards = projectDomainCards(projectId);

  return (
    <MenuCardsGrid
      title={project?.name ?? 'Dossier'}
      subtitle="Choisissez un domaine métier de ce dossier."
      cards={cards}
    />
  );
}
