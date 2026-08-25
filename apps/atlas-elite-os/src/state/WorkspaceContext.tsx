import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { workspaceCatalog } from '../data/workspaces';
import { reportingPeriods } from '../data/projects';

export type ReportingPeriodId = (typeof reportingPeriods)[number]['id'];

interface WorkspaceContextValue {
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
  workspaceName: string;
  periodId: ReportingPeriodId;
  setPeriodId: (id: ReportingPeriodId) => void;
  periodLabel: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState('ws-hvcg');
  const [periodId, setPeriodId] = useState<ReportingPeriodId>('mtd');

  const value = useMemo(() => {
    const ws = workspaceCatalog.find((w) => w.id === workspaceId) || workspaceCatalog[0];
    const period = reportingPeriods.find((p) => p.id === periodId) || reportingPeriods[0];
    return {
      workspaceId: ws.id,
      setWorkspaceId,
      workspaceName: ws.name,
      periodId: period.id,
      setPeriodId,
      periodLabel: period.label,
    };
  }, [workspaceId, periodId]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaceContext requires WorkspaceProvider');
  return ctx;
}
