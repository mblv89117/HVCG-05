import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  seedAcceptanceLog,
  seedDecisionHistory,
  seedRecommendations,
} from '../data/decisionEngine'
import { auditLog as seedAudit } from '../data/financeStore'
import { GENERATED_AT } from '../data/verifiedSources'
import type {
  AuditEvent,
  DecisionHistoryItem,
  ExecutiveRecommendation,
  OrganizationId,
  RecommendationAcceptanceEvent,
  RecommendationStatus,
  Role,
} from '../types'

interface FinanceContextValue {
  role: Role
  setRole: (role: Role) => void
  organizationId: OrganizationId
  setOrganizationId: (org: OrganizationId) => void
  generatedAt: string
  recommendations: ExecutiveRecommendation[]
  acceptanceLog: RecommendationAcceptanceEvent[]
  decisionHistory: DecisionHistoryItem[]
  auditLog: AuditEvent[]
  respondToRecommendation: (
    recommendationId: string,
    action: 'Accepted' | 'Deferred' | 'Rejected' | 'Reopened',
    note?: string,
  ) => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

function statusFromAction(action: RecommendationAcceptanceEvent['action']): RecommendationStatus {
  if (action === 'Accepted') return 'Accepted'
  if (action === 'Deferred') return 'Deferred'
  if (action === 'Rejected') return 'Rejected'
  return 'Proposed'
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('Owner')
  const [organizationId, setOrganizationId] = useState<OrganizationId>('HVCG')
  const [recommendations, setRecommendations] = useState(seedRecommendations)
  const [acceptanceLog, setAcceptanceLog] = useState(seedAcceptanceLog)
  const [decisionHistory, setDecisionHistory] = useState(seedDecisionHistory)
  const [auditLog, setAuditLog] = useState(seedAudit)

  const respondToRecommendation = useCallback(
    (recommendationId: string, action: 'Accepted' | 'Deferred' | 'Rejected' | 'Reopened', note = '') => {
      const at = new Date().toISOString()
      const actor = `${role} (session)`
      setRecommendations((prev) => {
        const rec = prev.find((r) => r.id === recommendationId)
        if (action === 'Accepted' && rec) {
          const history: DecisionHistoryItem = {
            id: `dec-${at}-${recommendationId}`,
            title: rec.title,
            decision: rec.ownerActionPrompt,
            outcome: `Accepted — ${rec.summary}`,
            organizationId: rec.organizationId,
            relatedRecommendationId: rec.id,
            sourceIds: rec.sourceIds,
            verificationStatus: rec.verificationStatus,
            decidedAt: at,
            decidedBy: actor,
            role,
          }
          setDecisionHistory((h) => [history, ...h])
        }
        return prev.map((r) =>
          r.id === recommendationId ? { ...r, status: statusFromAction(action), updatedAt: at } : r,
        )
      })
      const event: RecommendationAcceptanceEvent = {
        id: `acc-${at}-${recommendationId}`,
        recommendationId,
        action,
        actor,
        role,
        note: note || `${action} via Finance Intelligence decision engine`,
        at,
      }
      setAcceptanceLog((prev) => [event, ...prev])
      setAuditLog((prev) => [
        {
          id: `aud-${at}-${recommendationId}`,
          at,
          actor,
          role,
          action: `Recommendation ${action}`,
          entity: recommendationId,
          detail: note || `${action} with citations retained`,
        },
        ...prev,
      ])
    },
    [role],
  )

  const value = useMemo(
    () => ({
      role,
      setRole,
      organizationId,
      setOrganizationId,
      generatedAt: GENERATED_AT,
      recommendations,
      acceptanceLog,
      decisionHistory,
      auditLog,
      respondToRecommendation,
    }),
    [
      role,
      organizationId,
      recommendations,
      acceptanceLog,
      decisionHistory,
      auditLog,
      respondToRecommendation,
    ],
  )
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
