import type { KnowledgeUser, RoleId } from './types'

const ALIASES: Record<string, RoleId> = {
  owner: 'Owner',
  admin: 'Admin',
  administrator: 'Admin',
  opsmanager: 'OpsManager',
  'ops manager': 'OpsManager',
  operationsmanager: 'OpsManager',
  projectmanager: 'ProjectManager',
  'project manager': 'ProjectManager',
  pm: 'ProjectManager',
  capitaladvisor: 'CapitalAdvisor',
  'capital advisor': 'CapitalAdvisor',
  advisor: 'CapitalAdvisor',
  financialanalyst: 'FinancialAnalyst',
  'financial analyst': 'FinancialAnalyst',
  finance: 'FinancialAnalyst',
  opsassistant: 'OpsAssistant',
  contractor: 'Contractor',
  readonly: 'ReadOnly',
  'read only': 'ReadOnly',
  clientcontact: 'ClientContact',
  'client contact': 'ClientContact',
  clientcontributor: 'ClientContact',
  client: 'ClientContact',
  unauthenticated: 'ReadOnly',
  unresolved: 'ReadOnly',
}

export function mapHostRole(raw: string | null | undefined): RoleId {
  if (!raw) return 'ReadOnly'
  const key = raw.trim().toLowerCase()
  return ALIASES[key] ?? ALIASES[key.replace(/\s+/g, '')] ?? 'ReadOnly'
}

export function knowledgeUserFromHost(input: {
  id?: string
  name?: string
  email?: string
  role: string
  assignedClients?: string[]
  organizationId?: string
}): KnowledgeUser {
  return {
    id: input.id ?? 'host-user',
    name: input.name ?? 'Host user',
    email: input.email ?? 'user@hvcg.example',
    role: mapHostRole(input.role),
    assignedClients: input.assignedClients ?? [],
    organizationId: input.organizationId ?? 'HVCG',
  }
}
