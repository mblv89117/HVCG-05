import snapshot from '../data/eosSnapshot.json'

export interface EosSummary {
  generatedAt: string
  environment: string
  atlasSyncStatus: string
  activeSprints: number
  qaQueue: number
  openTechnicalDebt: number
  openChangeRequests: number
  deploymentReady: boolean
  productionFrozen: boolean
}

export function readEosSummary(): EosSummary {
  return {
    generatedAt: snapshot.generatedAt,
    environment: snapshot.environment,
    atlasSyncStatus: snapshot.atlasSyncStatus,
    activeSprints: snapshot.activeSprints.length,
    qaQueue: snapshot.qaStatus.queueDepth,
    openTechnicalDebt: snapshot.technicalDebt.length,
    openChangeRequests: snapshot.openChangeRequests.length,
    deploymentReady: snapshot.deploymentReadiness.ready,
    productionFrozen: snapshot.activeTracks.some((track) => track.id === 'track1' && track.status === 'FROZEN'),
  }
}
