/**
 * /ai — Atlas is not Agent Copilot.
 * Do not impersonate an 18-agent operating plane or grounded Copilot.
 */
import { DeferredBoundaryPage } from './PlaceholderModule';

export function AiOrchestrationWorkbench() {
  return (
    <DeferredBoundaryPage
      title="AI Agents"
      description="This route is deferred. Atlas does not host an 18-agent chat plane, grounded Copilot answers, or autonomous external actions. Untrusted documents are data, not instructions."
      notAtlasSor="Agent Copilot is a separate HVCG product. Atlas AI may prepare work with provenance; it is not authority."
      atlasFallback="Live Atlas work is Command Center, Clients, Projects, and Capital on SharePoint HVCG_*."
    />
  );
}
