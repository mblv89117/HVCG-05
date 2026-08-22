/**
 * Cross-account Client 360 builder.
 * Merges identical clients across mailboxes via entity resolution (email/phone/domain).
 * Uncertain matches stay review-only and are never auto-merged.
 */

import {
  clientMatchKeys,
  extractDomain,
  isConfidentClientMatch,
  type CanonicalRecord,
  type ProviderId,
} from '@hvcg/atlas-integration-core';
import { isConsumerDomain, isInternalDomain, isVendorNoiseDomain } from './classify.ts';
import type {
  Client360Candidate,
  Client360ExecutiveDashboard,
  Client360Lifecycle,
  Client360SourceRef,
  Client360TimelineEvent,
} from '../store/types.ts';
import type { IntegrationRepository } from '../store/repository.ts';

function emptyAssociations(): Client360Candidate['associations'] {
  return {
    emails: [],
    conversations: [],
    attachments: [],
    documents: [],
    meetings: [],
    notes: [],
    projects: [],
    invoices: [],
    proposals: [],
    fundingRequests: [],
    agreements: [],
    deliverables: [],
  };
}

function emailsFromRecord(r: CanonicalRecord): string[] {
  const out: string[] = [];
  const fields = r.fields || {};
  for (const key of ['from', 'email', 'accountEmail', 'sender', 'organizer']) {
    const v = fields[key];
    if (typeof v === 'string' && v.includes('@')) out.push(v);
  }
  for (const key of ['to', 'cc', 'attendees', 'emails']) {
    const v = fields[key];
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string' && item.includes('@')) out.push(item);
      }
    }
  }
  const summary = `${r.title} ${r.summary || ''}`;
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  out.push(...(summary.match(re) || []));
  return [...new Set(out.map((e) => e.toLowerCase()))];
}

function externalEmails(emails: string[]): string[] {
  return emails.filter((e) => {
    const d = extractDomain(e);
    return d && !isInternalDomain(d) && !isConsumerDomain(d) && !isVendorNoiseDomain(d);
  });
}

function externalDomains(emails: string[]): string[] {
  return [
    ...new Set(
      emails
        .map((e) => extractDomain(e))
        .filter((d): d is string => {
          if (!d) return false;
          return !isInternalDomain(d) && !isConsumerDomain(d) && !isVendorNoiseDomain(d);
        }),
    ),
  ];
}

function phonesFromRecord(r: CanonicalRecord): string[] {
  const out: string[] = [];
  const fields = r.fields || {};
  if (typeof fields.phone === 'string') out.push(fields.phone);
  if (Array.isArray(fields.businessPhones)) {
    for (const p of fields.businessPhones) if (typeof p === 'string') out.push(p);
  }
  return out;
}

function companyHint(r: CanonicalRecord): string | undefined {
  const company = r.fields.companyName;
  if (typeof company === 'string' && company.trim()) return company.trim();
  if (r.kind === 'Person' && r.summary) return r.summary;
  return undefined;
}

function displayNameFor(r: CanonicalRecord, emails: string[], domains: string[]): string {
  const company = companyHint(r);
  if (company) return company;
  if (domains[0]) {
    const base = domains[0].split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  if (r.kind === 'Person' && r.title) return r.title;
  if (emails[0]) return emails[0];
  // Avoid using raw email subjects as client names
  if (r.kind === 'Email' || r.kind === 'Meeting') return emails[0] || domains[0] || 'Unknown client';
  return r.title || 'Unknown client';
}

function associate(cand: Client360Candidate, r: CanonicalRecord) {
  const id = r.id;
  const a = cand.associations;
  switch (r.kind) {
    case 'Email':
      a.emails.push(id);
      if (typeof r.fields.conversationId === 'string') {
        a.conversations.push(r.fields.conversationId);
      }
      break;
    case 'Attachment':
      a.attachments.push(id);
      break;
    case 'Document':
      a.documents.push(id);
      break;
    case 'Meeting':
    case 'CalendarEvent':
      a.meetings.push(id);
      break;
    case 'Note':
      a.notes.push(id);
      break;
    case 'Project':
      a.projects.push(id);
      break;
    case 'Invoice':
      a.invoices.push(id);
      break;
    case 'Proposal':
      a.proposals.push(id);
      break;
    case 'FundingRequest':
      a.fundingRequests.push(id);
      break;
    case 'Agreement':
      a.agreements.push(id);
      break;
    case 'Deliverable':
      a.deliverables.push(id);
      break;
    case 'Person':
      cand.contacts.push({
        name: r.title,
        email: Array.isArray(r.fields.emails) ? String(r.fields.emails[0] || '') : undefined,
        phone: typeof r.fields.phone === 'string' ? r.fields.phone : undefined,
        title: typeof r.fields.jobTitle === 'string' ? r.fields.jobTitle : undefined,
      });
      break;
    default:
      if (r.kind === 'Communication') a.notes.push(id);
      else a.documents.push(id);
  }
}

function inferLifecycle(cand: Client360Candidate): Client360Lifecycle {
  const hasInvoice = cand.associations.invoices.length > 0;
  const hasAgreement = cand.associations.agreements.length > 0;
  const hasProject = cand.associations.projects.length > 0;
  const hasProposal = cand.associations.proposals.length > 0;
  const last = cand.timeline[0]?.at;
  const days =
    last && !Number.isNaN(Date.parse(last))
      ? (Date.now() - Date.parse(last)) / (1000 * 60 * 60 * 24)
      : null;

  if (hasInvoice || hasAgreement || hasProject) {
    if (days != null && days > 365) return 'former';
    return 'active';
  }
  if (hasProposal || cand.associations.emails.length > 0 || cand.associations.meetings.length > 0) {
    return 'prospect';
  }
  return 'unknown';
}

function computeCompleteness(cand: Client360Candidate): {
  score: number;
  missing: string[];
  actions: string[];
} {
  const checks: Array<{ key: string; ok: boolean; weight: number; action: string }> = [
    {
      key: 'Primary contact email',
      ok: cand.emails.length > 0,
      weight: 15,
      action: 'Capture a primary client contact email',
    },
    {
      key: 'Business domain',
      ok: cand.domains.length > 0,
      weight: 10,
      action: 'Confirm client business domain',
    },
    {
      key: 'Named contacts',
      ok: cand.contacts.length > 0,
      weight: 10,
      action: 'Import or add at least one named contact',
    },
    {
      key: 'Email history',
      ok: cand.associations.emails.length > 0,
      weight: 15,
      action: 'Sync mailbox conversations for this client',
    },
    {
      key: 'Documents',
      ok: cand.associations.documents.length + cand.associations.attachments.length > 0,
      weight: 10,
      action: 'Index related SharePoint / OneDrive documents',
    },
    {
      key: 'Meetings',
      ok: cand.associations.meetings.length > 0,
      weight: 10,
      action: 'Associate calendar meetings',
    },
    {
      key: 'Proposal or agreement',
      ok:
        cand.associations.proposals.length > 0 ||
        cand.associations.agreements.length > 0,
      weight: 15,
      action: 'Locate proposal or signed agreement',
    },
    {
      key: 'Invoice or funding',
      ok:
        cand.associations.invoices.length > 0 ||
        cand.associations.fundingRequests.length > 0,
      weight: 10,
      action: 'Attach invoice or funding request if applicable',
    },
    {
      key: 'Project / deliverable',
      ok:
        cand.associations.projects.length > 0 ||
        cand.associations.deliverables.length > 0,
      weight: 5,
      action: 'Link active project or deliverable',
    },
  ];

  let score = 0;
  const missing: string[] = [];
  const actions: string[] = [];
  for (const c of checks) {
    if (c.ok) score += c.weight;
    else {
      missing.push(c.key);
      actions.push(c.action);
    }
  }
  return { score, missing, actions: actions.slice(0, 5) };
}

function softDomainMatch(a: string[], b: string[]): boolean {
  const da = a.filter((k) => k.startsWith('domain:'));
  const db = b.filter((k) => k.startsWith('domain:'));
  return da.some((k) => db.includes(k));
}

export function buildClient360FromSources(repo: IntegrationRepository): Client360Candidate[] {
  const records = repo.listAllSourceRecords(200_000);
  const buckets = new Map<string, Client360Candidate>();

  for (const r of records) {
    const allEmails = emailsFromRecord(r);
    const emails = externalEmails(allEmails);
    const domains = externalDomains(allEmails);
    const phones = phonesFromRecord(r);
    const company = companyHint(r);

    // Skip pure internal-only noise (HVCG/HVS talking to itself with no external party)
    if (emails.length === 0 && domains.length === 0 && !company && r.kind !== 'Person') {
      continue;
    }

    const keys = clientMatchKeys({
      emails,
      domains,
      phones,
      businessName: company,
      legalName: company,
    });
    if (keys.length === 0 && !company) continue;

    const connectionId = String(r.fields.connectionId || r.provenance.sourceAccount);
    const ref: Client360SourceRef = {
      connectionId,
      providerId: r.provenance.provider as ProviderId,
      sourceAccount: r.provenance.sourceAccount,
      sourceRecordId: r.provenance.sourceRecordId,
      kind: r.kind,
      title: r.title,
      occurredAt:
        (typeof r.fields.occurredAt === 'string' && r.fields.occurredAt) ||
        r.provenance.originalModifiedAt ||
        r.provenance.importedAt,
      businessEntity: String(r.fields.businessEntity || ''),
    };

    let matchedId: string | null = null;
    let softOnly = false;
    for (const [id, cand] of buckets) {
      if (keys.length && isConfidentClientMatch(cand.matchKeys, keys)) {
        matchedId = id;
        softOnly = false;
        break;
      }
      if (keys.length && softDomainMatch(cand.matchKeys, keys)) {
        matchedId = id;
        softOnly = true;
        // keep searching for a confident email/phone match
      }
    }

    if (matchedId) {
      const cand = buckets.get(matchedId)!;
      cand.sourceRefs.push(ref);
      cand.matchKeys = [...new Set([...cand.matchKeys, ...keys])];
      cand.emails = [...new Set([...cand.emails, ...emails])];
      cand.domains = [...new Set([...cand.domains, ...domains])];
      cand.phones = [...new Set([...cand.phones, ...phones])];
      cand.connectionIds = [...new Set([...cand.connectionIds, connectionId])];
      if (ref.businessEntity) {
        cand.businessEntities = [...new Set([...cand.businessEntities, ref.businessEntity])];
      }
      associate(cand, r);
      if (company && (cand.displayName === 'Unknown client' || cand.displayName.includes('@'))) {
        cand.displayName = company;
      }
      if (!softOnly) cand.confidence = 'high';
      else if (cand.confidence !== 'high') cand.confidence = 'review';
      cand.updatedAt = new Date().toISOString();
    } else {
      const id = crypto.randomUUID();
      const cand: Client360Candidate = {
        id,
        displayName: displayNameFor(r, emails, domains),
        legalName: company,
        lifecycle: 'unknown',
        matchKeys: keys,
        emails,
        domains,
        phones,
        contacts: [],
        sourceRefs: [ref],
        associations: emptyAssociations(),
        timeline: [],
        completenessScore: 0,
        missingInformation: [],
        recommendedNextActions: [],
        confidence: emails.length || phones.length ? 'high' : 'review',
        duplicateCandidateIds: [],
        connectionIds: [connectionId],
        businessEntities: ref.businessEntity ? [ref.businessEntity] : [],
        updatedAt: new Date().toISOString(),
      };
      associate(cand, r);
      buckets.set(id, cand);
    }
  }

  // Build timelines, completeness, lifecycle; detect soft duplicates for review
  const list = [...buckets.values()];
  for (const cand of list) {
    // dedupe conversation ids
    cand.associations.conversations = [...new Set(cand.associations.conversations)];
    // dedupe contact emails
    const seenContact = new Set<string>();
    cand.contacts = cand.contacts.filter((c) => {
      const k = `${(c.email || '').toLowerCase()}|${c.name.toLowerCase()}`;
      if (seenContact.has(k)) return false;
      seenContact.add(k);
      return true;
    });

    const timeline: Client360TimelineEvent[] = cand.sourceRefs
      .filter((s) => s.occurredAt)
      .map((s) => ({
        at: s.occurredAt!,
        kind: s.kind,
        title: s.title,
        sourceRecordId: s.sourceRecordId,
        connectionId: s.connectionId,
      }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 200);
    cand.timeline = timeline;
    cand.lifecycle = inferLifecycle(cand);
    const { score, missing, actions } = computeCompleteness(cand);
    cand.completenessScore = score;
    cand.missingInformation = missing;
    cand.recommendedNextActions = actions;
  }

  // Flag domain-overlapping review pairs as duplicate candidates (do not merge)
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (softDomainMatch(a.matchKeys, b.matchKeys) && !isConfidentClientMatch(a.matchKeys, b.matchKeys)) {
        a.duplicateCandidateIds.push(b.id);
        b.duplicateCandidateIds.push(a.id);
        a.confidence = 'review';
        b.confidence = 'review';
      }
    }
  }

  list.sort((a, b) => b.sourceRefs.length - a.sourceRefs.length);

  // Second pass: attach documents / classified files that lack email keys
  // by matching title/path against known client domains and display names.
  const docKinds = new Set([
    'Document',
    'Attachment',
    'Invoice',
    'Proposal',
    'Agreement',
    'FundingRequest',
    'Deliverable',
    'Note',
    'Project',
  ]);
  const already = new Set<string>();
  for (const cand of list) {
    for (const ref of cand.sourceRefs) already.add(`${ref.connectionId}::${ref.sourceRecordId}`);
  }

  for (const r of records) {
    if (!docKinds.has(r.kind)) continue;
    const connectionId = String(r.fields.connectionId || r.provenance.sourceAccount);
    const key = `${connectionId}::${r.provenance.sourceRecordId}`;
    if (already.has(key)) continue;
    const hay = `${r.title} ${r.fields.path || ''} ${r.summary || ''}`.toLowerCase();
    if (!hay.trim()) continue;

    let best: Client360Candidate | null = null;
    let bestScore = 0;
    for (const cand of list) {
      let score = 0;
      for (const d of cand.domains) {
        if (hay.includes(d.toLowerCase())) score += 6;
        else {
          const base = d.split('.')[0];
          // Avoid short/common stems (mail, state, engage, bank) matching too broadly
          if (base.length >= 8 && hay.includes(base.toLowerCase())) score += 3;
        }
      }
      const name = (cand.legalName || cand.displayName || '').toLowerCase().trim();
      // Prefer longer names; short names must match as whole words to avoid
      // "engage" matching every "engagement" document.
      if (name.length >= 10 && hay.includes(name)) score += 5;
      else if (name.length >= 6) {
        try {
          if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay)) {
            score += 5;
          }
        } catch {
          /* ignore bad name regex */
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }
    if (!best || bestScore < 5) continue;

    const ref: Client360SourceRef = {
      connectionId,
      providerId: r.provenance.provider as ProviderId,
      sourceAccount: r.provenance.sourceAccount,
      sourceRecordId: r.provenance.sourceRecordId,
      kind: r.kind,
      title: r.title,
      occurredAt:
        (typeof r.fields.occurredAt === 'string' && r.fields.occurredAt) ||
        r.provenance.originalModifiedAt ||
        r.provenance.importedAt,
      businessEntity: String(r.fields.businessEntity || ''),
    };
    best.sourceRefs.push(ref);
    associate(best, r);
    already.add(key);
  }

  // Recompute timeline / completeness after document linking
  for (const cand of list) {
    cand.associations.conversations = [...new Set(cand.associations.conversations)];
    const timeline: Client360TimelineEvent[] = cand.sourceRefs
      .filter((s) => s.occurredAt)
      .map((s) => ({
        at: s.occurredAt!,
        kind: s.kind,
        title: s.title,
        sourceRecordId: s.sourceRecordId,
        connectionId: s.connectionId,
      }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 200);
    cand.timeline = timeline;
    cand.lifecycle = inferLifecycle(cand);
    const { score, missing, actions } = computeCompleteness(cand);
    cand.completenessScore = score;
    cand.missingInformation = missing;
    cand.recommendedNextActions = actions;
    cand.updatedAt = new Date().toISOString();
  }

  list.sort((a, b) => b.sourceRefs.length - a.sourceRefs.length);
  repo.saveClient360(list);
  return list;
}

export function buildExecutiveDashboard(repo: IntegrationRepository): Client360ExecutiveDashboard {
  const clients = repo.listClient360();
  const records = repo.listAllSourceRecords(200_000);
  const msConns = repo.listConnections({ providerId: 'microsoft' }).filter((c) => c.status === 'Connected');

  const avg =
    clients.length === 0
      ? 0
      : Math.round(
          (clients.reduce((s, c) => s + (c.completenessScore || 0), 0) / clients.length) * 10,
        ) / 10;

  const distribution = { high: 0, medium: 0, low: 0 };
  for (const c of clients) {
    if (c.completenessScore >= 70) distribution.high++;
    else if (c.completenessScore >= 40) distribution.medium++;
    else distribution.low++;
  }

  const byEntity: Record<string, number> = {};
  for (const c of clients) {
    for (const e of c.businessEntities.length ? c.businessEntities : ['unknown']) {
      byEntity[e] = (byEntity[e] || 0) + 1;
    }
  }

  const duplicateSet = new Set<string>();
  for (const c of clients) {
    if (c.duplicateCandidateIds?.length) duplicateSet.add(c.id);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalClientsDiscovered: clients.length,
    activeClients: clients.filter((c) => c.lifecycle === 'active').length,
    formerClients: clients.filter((c) => c.lifecycle === 'former').length,
    prospects: clients.filter((c) => c.lifecycle === 'prospect').length,
    documentsIndexed: records.filter((r) =>
      ['Document', 'Proposal', 'Agreement', 'Deliverable', 'Invoice', 'FundingRequest', 'Note', 'Project'].includes(
        r.kind,
      ),
    ).length,
    emailsIndexed: records.filter((r) => r.kind === 'Email').length,
    attachmentsIndexed: records.filter((r) => r.kind === 'Attachment').length,
    meetingsIndexed: records.filter((r) => r.kind === 'Meeting' || r.kind === 'CalendarEvent').length,
    contactsIndexed: records.filter((r) => r.kind === 'Person').length,
    sourceRecordsIndexed: records.length,
    microsoftConnectionsSynced: msConns.length,
    averageCompletenessScore: avg,
    completenessDistribution: distribution,
    duplicateCandidates: duplicateSet.size,
    clientsNeedingReview: clients.filter((c) => c.confidence === 'review').length,
    topIncompleteClients: [...clients]
      .sort((a, b) => a.completenessScore - b.completenessScore)
      .slice(0, 15)
      .map((c) => ({
        id: c.id,
        displayName: c.displayName,
        completenessScore: c.completenessScore,
        missingInformation: c.missingInformation,
      })),
    byBusinessEntity: byEntity,
  };
}

export function runClient360Ingestion(repo: IntegrationRepository) {
  return buildClient360FromSources(repo);
}
