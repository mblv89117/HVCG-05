export type { KnowledgeArticle, KnowledgeUser, AtlasModule, RoleId, SearchFilters, ApprovalStatus } from './types'
export { KNOWLEDGE_CATALOG, REFERENCE_TODAY, HVCG_ORG_ID } from './catalog'
export { canViewArticle, isAiGroundable, visibleArticles } from './access'
export { searchArticles, moduleSearch, recentlyUpdated, mostUsed } from './search'
export { suggestKnowledge, type SuggestInput } from './contextual'
export { isStale, staleArticles } from './stale'
export {
  filterAiGroundingCorpus,
  assertApprovedCitations,
  attachApprovedCitations,
  type AiCitation,
} from './aiGrounding'
export { mapHostRole, knowledgeUserFromHost } from './roleMap'
export { ModuleKnowledgeRail } from './ModuleKnowledgeRail'
