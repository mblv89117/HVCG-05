import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AccountingEntityRecord,
  ConsentRecord,
  OAuthStateRecord,
  QboConnectionRecord,
  ReportSnapshotRecord,
  StoreSnapshot,
} from './types.ts';

const empty = (): StoreSnapshot => ({
  consents: [],
  oauthStates: [],
  connections: [],
  entities: [],
  reports: [],
});

export class QboRepository {
  private data: StoreSnapshot;
  private path: string;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.path = join(dataDir, 'qbo-store.json');
    if (existsSync(this.path)) {
      this.data = JSON.parse(readFileSync(this.path, 'utf8')) as StoreSnapshot;
    } else {
      this.data = empty();
      this.persist();
    }
  }

  private persist() {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), { mode: 0o600 });
  }

  saveConsent(c: ConsentRecord) {
    this.data.consents.push(c);
    this.persist();
  }

  saveOAuthState(s: OAuthStateRecord) {
    this.data.oauthStates.push(s);
    this.persist();
  }

  consumeOAuthState(state: string): OAuthStateRecord | undefined {
    const rec = this.data.oauthStates.find((s) => s.state === state && !s.consumedAt);
    if (!rec) return undefined;
    if (new Date(rec.expiresAt).getTime() < Date.now()) return undefined;
    rec.consumedAt = new Date().toISOString();
    this.persist();
    return rec;
  }

  upsertConnection(conn: QboConnectionRecord) {
    const i = this.data.connections.findIndex((x) => x.id === conn.id);
    if (i >= 0) this.data.connections[i] = conn;
    else this.data.connections.push(conn);
    this.persist();
  }

  getConnection(connectionId: string): QboConnectionRecord | undefined {
    return this.data.connections.find((x) => x.id === connectionId && !x.deletedAt);
  }

  getConnectionByRealm(clientId: string, realmId: string): QboConnectionRecord | undefined {
    return this.data.connections.find(
      (x) =>
        x.clientId === clientId &&
        x.realmId === realmId &&
        !x.deletedAt &&
        x.status !== 'Disconnected',
    );
  }

  listConnectionsForClient(clientId: string): QboConnectionRecord[] {
    return this.data.connections.filter((x) => x.clientId === clientId && !x.deletedAt);
  }

  listActiveConnections(): QboConnectionRecord[] {
    return this.data.connections.filter(
      (x) => !x.deletedAt && (x.status === 'Connected' || x.status === 'Error' || x.status === 'Syncing'),
    );
  }

  upsertEntities(rows: AccountingEntityRecord[]) {
    for (const row of rows) {
      const i = this.data.entities.findIndex(
        (e) =>
          e.connectionId === row.connectionId &&
          e.entityType === row.entityType &&
          e.externalId === row.externalId,
      );
      if (i >= 0) this.data.entities[i] = { ...row, id: this.data.entities[i].id, createdAt: this.data.entities[i].createdAt };
      else this.data.entities.push(row);
    }
    this.persist();
  }

  listEntitiesForClient(clientId: string, entityType?: string): AccountingEntityRecord[] {
    return this.data.entities.filter(
      (e) => e.clientId === clientId && !e.deletedAt && (!entityType || e.entityType === entityType),
    );
  }

  countEntities(connectionId: string, entityType: string): number {
    return this.data.entities.filter(
      (e) => e.connectionId === connectionId && e.entityType === entityType && !e.deletedAt,
    ).length;
  }

  saveReport(report: ReportSnapshotRecord) {
    this.data.reports = this.data.reports.filter(
      (r) => !(r.connectionId === report.connectionId && r.reportType === report.reportType),
    );
    this.data.reports.push(report);
    this.persist();
  }

  listReportsForClient(clientId: string): ReportSnapshotRecord[] {
    return this.data.reports.filter((r) => r.clientId === clientId);
  }
}
