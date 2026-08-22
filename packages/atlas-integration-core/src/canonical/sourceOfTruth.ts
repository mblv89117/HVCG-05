import type { CanonicalEntityKind } from '../types/records.ts';

export type SourceOfTruthOwner = 'provider' | 'atlas' | 'shared' | 'external_system';

export interface FieldOwnershipRule {
  entityKind: CanonicalEntityKind;
  fieldPath: string;
  owner: SourceOfTruthOwner;
  rationale: string;
  atlasMayStore: Array<'copy' | 'index' | 'metadata' | 'summary' | 'reference'>;
}

/**
 * Field-level source-of-truth rules.
 * Atlas does NOT become SoR for original emails, documents, accounting balances, or signed contracts.
 */
export const SOURCE_OF_TRUTH_RULES: FieldOwnershipRule[] = [
  {
    entityKind: 'Email',
    fieldPath: '*',
    owner: 'provider',
    rationale: 'Original email remains authoritative in Outlook or Gmail.',
    atlasMayStore: ['index', 'metadata', 'summary', 'reference', 'copy'],
  },
  {
    entityKind: 'Document',
    fieldPath: '*',
    owner: 'provider',
    rationale:
      'Original document remains authoritative in SharePoint, OneDrive, Google Drive, or originating system.',
    atlasMayStore: ['index', 'metadata', 'summary', 'reference', 'copy'],
  },
  {
    entityKind: 'Attachment',
    fieldPath: '*',
    owner: 'provider',
    rationale: 'Attachments remain authoritative in the mail or storage provider.',
    atlasMayStore: ['reference', 'copy', 'metadata'],
  },
  {
    entityKind: 'Task',
    fieldPath: '*',
    owner: 'shared',
    rationale:
      'Atlas-generated tasks may be authoritative in Atlas and synchronized to Planner or GitHub. Provider-native tasks remain authoritative in the provider unless Atlas-owned.',
    atlasMayStore: ['copy', 'metadata', 'reference'],
  },
  {
    entityKind: 'Invoice',
    fieldPath: 'balances',
    owner: 'external_system',
    rationale: 'Accounting balances remain authoritative in the accounting platform.',
    atlasMayStore: ['metadata', 'reference', 'summary'],
  },
  {
    entityKind: 'Payment',
    fieldPath: '*',
    owner: 'external_system',
    rationale: 'Payment processor remains authoritative for settlement state.',
    atlasMayStore: ['metadata', 'reference', 'summary'],
  },
  {
    entityKind: 'Document',
    fieldPath: 'signedContract',
    owner: 'external_system',
    rationale: 'Signed contracts remain authoritative in e-signature or source-document system.',
    atlasMayStore: ['reference', 'metadata', 'copy'],
  },
  {
    entityKind: 'Issue',
    fieldPath: '*',
    owner: 'shared',
    rationale: 'Atlas-created issues may sync to GitHub; GitHub-native issues remain authoritative there.',
    atlasMayStore: ['copy', 'metadata', 'reference'],
  },
  {
    entityKind: 'Client',
    fieldPath: 'atlasProfile',
    owner: 'atlas',
    rationale: 'Client 360 profile fields curated in Atlas are Atlas-owned.',
    atlasMayStore: ['copy', 'metadata'],
  },
];

export function rulesFor(entityKind: CanonicalEntityKind): FieldOwnershipRule[] {
  return SOURCE_OF_TRUTH_RULES.filter((r) => r.entityKind === entityKind);
}
