import type { PortalRole, VisibilityRole } from '../types'

/** Staff / HVCG-side roles (Executive Dashboard release matrix). */
export function isStaffRole(role: PortalRole): boolean {
  return (
    role === 'HVCG Owner' ||
    role === 'HVCG Team Member' ||
    role === 'Administrator' ||
    role === 'Read-Only Advisor'
  )
}

/** Roles that may upload / complete document requests in the client workspace. */
export function canContribute(role: PortalRole): boolean {
  return (
    role === 'Client Contributor' ||
    role === 'Client Executive' ||
    role === 'HVCG Owner' ||
    role === 'HVCG Team Member' ||
    role === 'Administrator'
  )
}

/** Internal notes and Internal-sensitivity documents. */
export function canViewVisibility(role: PortalRole, visibility: VisibilityRole): boolean {
  if (visibility === 'ClientVisible') return true
  return role === 'HVCG Owner' || role === 'HVCG Team Member' || role === 'Administrator'
}

export function assertClientAccess(userClientIds: string[], clientId: string): boolean {
  return userClientIds.includes(clientId)
}

/** Elite OS recovery role alias → portal role (Client Team Member ≈ Client Contributor). */
export function mapEliteRoleToPortal(eliteRole: string): PortalRole | null {
  const map: Record<string, PortalRole> = {
    'HVCG Owner': 'HVCG Owner',
    'HVCG Team Member': 'HVCG Team Member',
    'Client Executive': 'Client Executive',
    'Client Contributor': 'Client Contributor',
    'Client Team Member': 'Client Contributor',
    'Read-Only Advisor': 'Read-Only Advisor',
    Administrator: 'Administrator',
  }
  return map[eliteRole] ?? null
}
