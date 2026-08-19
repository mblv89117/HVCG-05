/**
 * /executive — Dataverse analytics are not Atlas V1 SoR.
 * Command Center (/) is the live operate home.
 */
import { DeferredBoundaryPage } from './PlaceholderModule';

export function ExecutiveDashboardPage() {
  return (
    <DeferredBoundaryPage
      title="Analytics"
      description="This route is deferred. Atlas does not host a Dataverse executive dashboard or Fractional CFO KPI wall. The operate home is Command Center."
      notAtlasSor="Dynamics / Dataverse is deferred (Owner Decision 3). SharePoint HVCG_* is Atlas V1 SoR. Growth Command Center owns commercial financial intelligence."
      atlasFallback="Use Command Center for what needs attention today."
    />
  );
}
