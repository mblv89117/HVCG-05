import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { seedDecisions, seedExceptions, seedInsights, seedMeetings } from '../data/intelligenceSeed'
import { buildCcbMeetingBrief, buildDailyHvgcBrief, buildWeeklyHvgcBrief } from '../intelligence/briefBuilder'
import { prioritizeInsights, topOpenInsights, actionableInsights } from '../intelligence/prioritize'
import type {
  DecisionItem,
  ExceptionItem,
  ExecutiveBriefDocument,
  Insight,
  MeetingDeadline,
  ReviewEvent,
  TaskItem,
} from '../types/intelligence'
import { useDashboard } from './DashboardContext'

interface IntelligenceContextValue {
  insights: Insight[]
  decisions: DecisionItem[]
  tasks: TaskItem[]
  exceptions: ExceptionItem[]
  meetings: MeetingDeadline[]
  reviewHistory: ReviewEvent[]
  prioritizedInsights: Insight[]
  openInsights: Insight[]
  stackInsights: Insight[]
  dailyBrief: ExecutiveBriefDocument
  weeklyBrief: ExecutiveBriefDocument
  ccbBrief: ExecutiveBriefDocument
  acceptInsight: (insightId: string, note?: string) => void
  dismissInsight: (insightId: string, note?: string) => void
  convertToDecision: (insightId: string) => void
  convertToTask: (insightId: string) => void
  acceptDecision: (decisionId: string) => void
}

const IntelligenceContext = createContext<IntelligenceContextValue | null>(null)

function stamp() {
  return new Date().toISOString()
}

export function IntelligenceProvider({ children }: { children: ReactNode }) {
  const { role } = useDashboard()
  const [insights, setInsights] = useState(seedInsights)
  const [decisions, setDecisions] = useState(seedDecisions)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [reviewHistory, setReviewHistory] = useState<ReviewEvent[]>([])
  const exceptions = seedExceptions
  const meetings = seedMeetings

  const pushReview = (insightId: string, action: ReviewEvent['action'], note?: string) => {
    setReviewHistory((current) => [
      {
        id: `REV-${current.length + 1}`,
        insightId,
        action,
        actor: 'Manny Barela',
        role,
        note,
        at: stamp(),
      },
      ...current,
    ])
  }

  const acceptInsight = (insightId: string, note?: string) => {
    setInsights((current) => current.map((item) => (item.id === insightId ? { ...item, status: 'Accepted' } : item)))
    pushReview(insightId, 'Accepted', note)
  }

  const dismissInsight = (insightId: string, note?: string) => {
    setInsights((current) => current.map((item) => (item.id === insightId ? { ...item, status: 'Dismissed' } : item)))
    pushReview(insightId, 'Dismissed', note)
  }

  const convertToDecision = (insightId: string) => {
    const insight = insights.find((item) => item.id === insightId)
    if (!insight) return
    const decision: DecisionItem = {
      id: `DEC-${Date.now()}`,
      title: insight.decisionPrompt ?? insight.title,
      context: insight.summary,
      due: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      owner: 'Manny Barela',
      impact: insight.impact,
      status: 'Pending',
      sourceInsightId: insight.id,
      sources: insight.sources,
      createdAt: stamp(),
    }
    setDecisions((current) => [decision, ...current])
    setInsights((current) => current.map((item) => (item.id === insightId ? { ...item, status: 'Converted' } : item)))
    pushReview(insightId, 'Converted to decision')
  }

  const convertToTask = (insightId: string) => {
    const insight = insights.find((item) => item.id === insightId)
    if (!insight) return
    const task: TaskItem = {
      id: `TSK-${Date.now()}`,
      title: insight.taskTitle ?? insight.title,
      due: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      owner: 'Manny Barela',
      domain: insight.domain,
      status: 'Open',
      sourceInsightId: insight.id,
      createdAt: stamp(),
    }
    setTasks((current) => [task, ...current])
    setInsights((current) => current.map((item) => (item.id === insightId ? { ...item, status: 'Converted' } : item)))
    pushReview(insightId, 'Converted to task')
  }

  const acceptDecision = (decisionId: string) => {
    setDecisions((current) => current.map((item) => (item.id === decisionId ? { ...item, status: 'Accepted' } : item)))
  }

  const value = useMemo<IntelligenceContextValue>(() => {
    const prioritizedInsights = prioritizeInsights(insights, role)
    const openInsights = topOpenInsights(insights, role, 8)
    const stackInsights = actionableInsights(insights, role, 8)
    return {
      insights,
      decisions,
      tasks,
      exceptions,
      meetings,
      reviewHistory,
      prioritizedInsights,
      openInsights,
      stackInsights,
      dailyBrief: buildDailyHvgcBrief(insights, decisions, exceptions, meetings, role),
      weeklyBrief: buildWeeklyHvgcBrief(insights, decisions, role),
      ccbBrief: buildCcbMeetingBrief(),
      acceptInsight,
      dismissInsight,
      convertToDecision,
      convertToTask,
      acceptDecision,
    }
  }, [insights, decisions, tasks, reviewHistory, role])

  return <IntelligenceContext.Provider value={value}>{children}</IntelligenceContext.Provider>
}

export function useIntelligence() {
  const value = useContext(IntelligenceContext)
  if (!value) throw new Error('useIntelligence must be used inside IntelligenceProvider')
  return value
}
