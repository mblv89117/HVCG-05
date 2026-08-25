/**
 * Capability labels that must survive a production Vite build.
 * Minifiers rename WorkflowTemplatesPanel; these string literals stay.
 * Do not tree-shake this module — main.tsx assigns it to a live DOM dataset.
 */
export const ELITE_CAPABILITY_MANIFEST = [
  'Ask Atlas',
  'Documents',
  'Agent Activity',
  'Workflow Center',
  'Onboarding',
  'WorkflowTemplates',
  'Approvals',
  'CommunicationPolicies',
] as const;

export function eliteCapabilityManifestJoined(): string {
  return ELITE_CAPABILITY_MANIFEST.join('|');
}
