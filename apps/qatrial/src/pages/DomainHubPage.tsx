import { useTranslation } from 'react-i18next';
import { MenuCardsGrid } from '../components/hub/MenuCard';
import { domainLeafCards, projectHubPath } from '../navigation/hub-config';
import { PROJECT_NAV_GROUPS } from '../navigation/nav-config';
import { Navigate, useParams } from 'react-router-dom';

export function DomainHubPage() {
  const { t } = useTranslation();
  const { projectId = '', domainId = '' } = useParams();
  const group = PROJECT_NAV_GROUPS.find((g) => g.id === domainId);
  if (!group) {
    return <Navigate to={projectHubPath(projectId)} replace />;
  }

  return (
    <MenuCardsGrid
      title={t(group.labelKey)}
      subtitle="Outils de ce domaine — une card = une feuille."
      cards={domainLeafCards(projectId, domainId)}
    />
  );
}
