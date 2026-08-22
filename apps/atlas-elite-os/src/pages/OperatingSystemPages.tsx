/**
 * /inbox and /team remain routed but are not Atlas V1 SoR.
 * Outlook stays Microsoft 365. AI assessment workers stay Agent Copilot.
 * Hub /api/pm/inbox and /api/pm/team are not implemented on SharePoint production.
 */
import { DeferredBoundaryPage } from './PlaceholderModule';

export function UniversalInboxPage() {
  return (
    <DeferredBoundaryPage
      title="Universal Inbox"
      description="This route is deferred. Atlas does not extract Outlook mail or treat an empty queue as a processed inbox. Hub inbox APIs are not implemented for SharePoint production."
      notAtlasSor="Microsoft 365 (Outlook) remains the mail system of record. Atlas does not impersonate M365 inbox processing."
      atlasFallback="Actionable Atlas work is Command Center, My Work, and project tasks on SharePoint HVCG_*."
    />
  );
}

export function TeamAgentsPage() {
  return (
    <DeferredBoundaryPage
      title="Team & Agents"
      description="This route is deferred. Atlas does not list Entra people or AI workers here. Hub team APIs are not implemented for SharePoint production. This page is not Agent Copilot."
      notAtlasSor="Microsoft 365 / Entra for people. Agent Copilot for AI Business MRI / assessment workers. EVA is only the website lead funnel into Copilot."
      atlasFallback="Atlas assignments live on projects and tasks (SharePoint HVCG_*)."
    />
  );
}
