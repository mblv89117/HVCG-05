/**
 * Client operations pack — manually initiated client review draft (Phase 3).
 */

export interface ClientOperationsPack {
  schemaVersion: '1.0.0-phase3';
  executiveSummary: string;
  activeProjects: string[];
  missingDocuments: string[];
  overdueCommitments: string[];
  currentRisks: string[];
  clientDependencies: string[];
  hvcgDependencies: string[];
  decisionsRequired: string[];
  recommendedNextActions: string[];
  tasksAiCouldHandle: string[];
  tasksRequiringManny: string[];
  tasksRecommendedForAutomation: string[];
  tasksRecommendedForElimination: string[];
  draftOnly: true;
  authoritativeRecordsUpdated: false;
}

export function emptyClientOperationsPack(): ClientOperationsPack {
  return {
    schemaVersion: '1.0.0-phase3',
    executiveSummary: '',
    activeProjects: [],
    missingDocuments: [],
    overdueCommitments: [],
    currentRisks: [],
    clientDependencies: [],
    hvcgDependencies: [],
    decisionsRequired: [],
    recommendedNextActions: [],
    tasksAiCouldHandle: [],
    tasksRequiringManny: [],
    tasksRecommendedForAutomation: [],
    tasksRecommendedForElimination: [],
    draftOnly: true,
    authoritativeRecordsUpdated: false,
  };
}

export function seedClientOperationsFromText(text: string): Partial<ClientOperationsPack> {
  return {
    missingDocuments: /\bmissing\b/i.test(text) ? ['Missing items referenced'] : [],
    overdueCommitments: /\boverdue|past due\b/i.test(text) ? ['Overdue language detected'] : [],
    currentRisks: /\brisk|concern\b/i.test(text) ? ['Risk language detected'] : [],
    tasksRecommendedForElimination: /\bduplicate|unnecessary|eliminate\b/i.test(text)
      ? ['Candidate elimination language detected']
      : [],
    tasksRecommendedForAutomation: /\brepeat|routine|automate\b/i.test(text)
      ? ['Automation candidate language detected']
      : [],
  };
}
