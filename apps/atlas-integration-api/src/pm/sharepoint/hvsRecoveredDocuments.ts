/**
 * First-level HVS-admin document inventory for recovered client folders.
 *
 * Evidence: 2026-08-22 HVS-admin Graph Sites.Read.All / Files.Read.All.
 * Metadata only — names, kinds, last-modified, and filename class.
 * Atlas does not copy binaries, extract balances, invent obligations,
 * or mint Hub MI HVCG_Clients rows.
 */

import type { KnowledgeProvenance } from './knowledgeClassification.ts';
import type { OperatingState } from './knowledgeClassification.ts';

export type HvsDocumentClass =
  | 'engagement'
  | 'agreement'
  | 'invoice'
  | 'capital_package'
  | 'financial_statement'
  | 'formation'
  | 'onboarding'
  | 'plan'
  | 'structured_folder'
  | 'unclassified';

export type HvsRecoveredDocument = {
  client: string;
  clientCode: string;
  name: string;
  kind: 'file' | 'folder';
  documentClass: HvsDocumentClass;
  lastModified?: string;
  provenance: 'CONFIRMED';
  amountsExtracted: false;
  binariesInAtlas: false;
};

export type HvsRecoveredAction = {
  id: string;
  client: string;
  clientCode: string;
  title: string;
  queue: Extract<OperatingState, 'Needs Action' | 'Decision Required' | 'Ready'>;
  kind: 'hvs_recovered_action';
  provenance: KnowledgeProvenance;
  evidence: string;
};

type RawChild = {
  name: string;
  kind: 'file' | 'folder';
  lastModified?: string;
};

const RAW: Array<{ client: string; clientCode: string; children: RawChild[] }> = [
  {
    client: 'ACCG Inc',
    clientCode: 'ACCG01',
    children: [
      { name: '01_Intake Docs', kind: 'folder', lastModified: '2025-12-18T18:25:09Z' },
      { name: '02_Financial Docs', kind: 'folder', lastModified: '2025-12-18T18:25:09Z' },
      { name: '03_Corporate Docs', kind: 'folder', lastModified: '2025-12-18T18:25:09Z' },
      { name: '04_Bank & AR Docs', kind: 'folder', lastModified: '2025-12-18T18:25:09Z' },
      { name: '05_Contracts & Invoice Docs', kind: 'folder', lastModified: '2025-12-18T18:25:09Z' },
      { name: '06_Personal', kind: 'folder', lastModified: '2026-02-03T20:39:06Z' },
      { name: '07_Projects', kind: 'folder', lastModified: '2026-02-03T20:40:35Z' },
      { name: '08_Archive', kind: 'folder', lastModified: '2026-02-03T20:42:52Z' },
      { name: '99_Internal (HVS only)', kind: 'folder', lastModified: '2025-12-18T18:25:09Z' },
    ],
  },
  {
    client: "Christie's Place",
    clientCode: 'CPL01',
    children: [
      { name: 'Annuity', kind: 'folder', lastModified: '2026-07-14T22:16:35Z' },
      { name: 'Cursor Master Prompt.docx', kind: 'file', lastModified: '2026-05-25T03:27:05Z' },
      { name: "Invoice for Christie's Place 6.19.26 part 2.pdf", kind: 'file', lastModified: '2026-06-23T01:53:53Z' },
      { name: "Invoice for Christie's Place 6.19.26.pdf", kind: 'file', lastModified: '2026-06-23T01:53:22Z' },
      { name: 'Master Prompt.docx', kind: 'file', lastModified: '2026-05-26T15:41:26Z' },
    ],
  },
  {
    client: 'Colorado Beef',
    clientCode: 'CCB01',
    children: [
      { name: 'HVCG Engagement 7.20.26.pdf', kind: 'file', lastModified: '2026-07-20T21:42:16Z' },
      { name: 'HVCG Engagement.pdf', kind: 'file', lastModified: '2026-07-20T21:13:50Z' },
      { name: 'Next Steps Instructions Letter (1).docx', kind: 'file', lastModified: '2026-07-20T21:31:39Z' },
      { name: 'Next Steps Instructions Letter (1).pdf', kind: 'file', lastModified: '2026-07-20T21:31:48Z' },
      { name: 'SBA Express Funding Checklist.docx', kind: 'file', lastModified: '2026-07-20T21:27:58Z' },
      { name: 'SBA Express Funding Checklist.pdf', kind: 'file', lastModified: '2026-07-20T21:28:26Z' },
      { name: 'SBA Express Loan Engagement Agreement.docx', kind: 'file', lastModified: '2026-07-20T20:42:01Z' },
      { name: 'SBA Express Loan Engagement Agreement.pdf', kind: 'file', lastModified: '2026-07-20T20:42:32Z' },
    ],
  },
  {
    client: 'Comic Books',
    clientCode: '',
    children: [
      { name: 'Comic Book System.docx', kind: 'file', lastModified: '2026-07-23T20:53:44Z' },
      { name: 'Confirmation.pdf', kind: 'file', lastModified: '2026-06-09T18:52:03Z' },
      { name: 'Physical Comic Book Collection System.docx', kind: 'file', lastModified: '2026-07-23T20:32:02Z' },
    ],
  },
  {
    client: 'Frocovery',
    clientCode: '',
    children: [
      { name: 'Formal', kind: 'folder', lastModified: '2026-03-10T21:30:28Z' },
      { name: 'FROCOVERY FILES', kind: 'folder', lastModified: '2026-03-12T20:57:42Z' },
      { name: 'EIN Frocovery LLC 3.8.26.pdf', kind: 'file', lastModified: '2026-03-10T21:29:13Z' },
      { name: 'EIN Frocovery LLC.pdf', kind: 'file', lastModified: '2026-03-10T17:32:01Z' },
      { name: 'Esignature Frocovery LLC.pdf', kind: 'file', lastModified: '2026-03-10T22:02:31Z' },
      { name: 'Frocovery Business Development Agreement 3.10.26.docx', kind: 'file', lastModified: '2026-03-10T20:57:15Z' },
      { name: 'Frocovery Business Plan.docx', kind: 'file', lastModified: '2026-03-12T22:05:51Z' },
      { name: 'Frocovery LLC Articles of Organization.pdf', kind: 'file', lastModified: '2026-03-10T19:08:34Z' },
      { name: 'Frocovery_Founder_Launch_Action_Plan.docx', kind: 'file', lastModified: '2026-03-10T21:26:28Z' },
      { name: 'Frocovery_LLC_Business_Development_Agreement.docx', kind: 'file', lastModified: '2026-03-10T21:13:22Z' },
      { name: 'Frocovery_LLC_Operating_Agreement.docx', kind: 'file', lastModified: '2026-03-10T19:52:14Z' },
      { name: 'Frocovery_LLC_Operating_Agreement.pdf', kind: 'file', lastModified: '2026-03-10T19:55:12Z' },
      { name: 'Frocovery_Recovery_Business_Plan.docx', kind: 'file', lastModified: '2026-03-10T19:46:45Z' },
      { name: 'Frocovery_Recovery_Business_Plan.pdf', kind: 'file', lastModified: '2026-03-10T19:46:11Z' },
    ],
  },
  {
    client: 'Integrity Lift Solutions LLC',
    clientCode: '',
    children: [
      { name: '01_Intake Docs', kind: 'folder', lastModified: '2026-02-03T21:40:37Z' },
      { name: '02_Financial Docs', kind: 'folder', lastModified: '2026-02-03T21:48:00Z' },
      { name: '03_Corporate Docs', kind: 'folder', lastModified: '2026-02-03T21:47:32Z' },
      { name: '04_Bank & AR Docs', kind: 'folder', lastModified: '2026-02-03T21:45:17Z' },
      { name: '05_Contracts & Invoice Docs', kind: 'folder', lastModified: '2026-02-03T21:47:23Z' },
      { name: '06_Lender Packages', kind: 'folder', lastModified: '2026-02-03T21:42:39Z' },
      { name: '07_Projects & Services', kind: 'folder', lastModified: '2026-01-27T17:40:11Z' },
      { name: '08_Archive', kind: 'folder', lastModified: '2026-02-03T21:48:42Z' },
      { name: '99_Internal (HVS only)', kind: 'folder', lastModified: '2026-01-27T15:38:52Z' },
    ],
  },
  {
    client: 'Lien Partners LLC',
    clientCode: 'LIEN01',
    children: [
      { name: '01_Intake Docs', kind: 'folder', lastModified: '2026-02-03T20:52:23Z' },
      { name: '02_Financial Docs', kind: 'folder', lastModified: '2026-02-03T20:56:30Z' },
      { name: '03_Corporate Docs', kind: 'folder', lastModified: '2026-02-03T20:55:13Z' },
      { name: '04_Bank & AR Docs', kind: 'folder', lastModified: '2026-02-03T20:51:06Z' },
      { name: '05_Contracts & Invoice Docs', kind: 'folder', lastModified: '2026-01-27T15:38:55Z' },
      { name: '06_Lender Packages', kind: 'folder', lastModified: '2026-02-03T20:51:07Z' },
      { name: '07_Projects & Services', kind: 'folder', lastModified: '2026-01-27T17:40:11Z' },
      { name: '99_Internal (HVS only)', kind: 'folder', lastModified: '2026-02-03T20:57:50Z' },
    ],
  },
  {
    client: 'LV Appraisals',
    clientCode: '',
    children: [
      { name: '01_Intake Docs', kind: 'folder', lastModified: '2026-01-27T15:38:52Z' },
      { name: '02_Financial Docs', kind: 'folder', lastModified: '2026-01-27T15:38:55Z' },
      { name: '03_Corporate Docs', kind: 'folder', lastModified: '2026-01-27T15:38:55Z' },
      { name: '04_Bank & AR Docs', kind: 'folder', lastModified: '2026-01-27T19:48:01Z' },
      { name: '05_Contracts & Invoice Docs', kind: 'folder', lastModified: '2026-01-27T15:38:55Z' },
      { name: '06_Lender Packages', kind: 'folder', lastModified: '2026-01-27T19:48:01Z' },
      { name: '07_Projects & Services', kind: 'folder', lastModified: '2026-01-27T17:40:11Z' },
      { name: '99_Internal (HVS only)', kind: 'folder', lastModified: '2026-01-27T15:38:52Z' },
    ],
  },
  {
    client: "Pierlo Inc (DBA Baker's Travertine Power Clean)",
    clientCode: '',
    children: [
      { name: 'New Client Template', kind: 'folder', lastModified: '2026-01-22T21:03:16Z' },
    ],
  },
  {
    client: 'Prodigy Games',
    clientCode: 'PDG01',
    children: [
      { name: '00ACT_0126 Purchase', kind: 'folder', lastModified: '2026-01-27T20:04:36Z' },
      { name: '01_Intake Docs', kind: 'folder', lastModified: '2026-01-27T19:51:21Z' },
      { name: '02_Financial Docs', kind: 'folder', lastModified: '2026-01-27T19:58:25Z' },
      { name: '03_Corporate Docs', kind: 'folder', lastModified: '2026-01-27T19:51:21Z' },
      { name: '04_Bank & AR Docs', kind: 'folder', lastModified: '2026-01-27T19:57:56Z' },
      { name: '05_Contracts & Invoice Docs', kind: 'folder', lastModified: '2026-01-27T19:51:21Z' },
      { name: '06_Lender Packages', kind: 'folder', lastModified: '2026-01-27T19:57:56Z' },
      { name: '07_Projects & Services', kind: 'folder', lastModified: '2026-01-27T19:51:21Z' },
      { name: '99_Internal (HVS only)', kind: 'folder', lastModified: '2026-01-27T19:51:21Z' },
      { name: 'Master Prompt for Teaser.docx', kind: 'file', lastModified: '2026-03-10T17:46:33Z' },
      { name: 'Pre approval letter template.docx', kind: 'file', lastModified: '2026-01-26T23:32:45Z' },
      { name: 'Prodigy Games LLC PL 2024.pdf', kind: 'file', lastModified: '2026-03-26T20:32:45Z' },
      { name: 'Prodigy Games LLC PL Month by Month 2025.pdf', kind: 'file', lastModified: '2026-03-26T20:30:07Z' },
      { name: 'Prodigy Games LLC PL Month by Month 2026.pdf', kind: 'file', lastModified: '2026-03-26T20:28:31Z' },
      { name: 'Prodigy_Games_10Day_Cleanup_Plan.docx', kind: 'file', lastModified: '2026-01-26T23:19:41Z' },
      { name: 'Prodigy_Games_Capital_Acquisition_Plan_COMPREHENSIVE 1.26.26.docx', kind: 'file', lastModified: '2026-01-27T00:11:42Z' },
      { name: 'Prodigy_Games_Engagement_Plan.docx', kind: 'file', lastModified: '2026-01-26T21:42:35Z' },
      { name: 'Prodigy_Games_Onboarding_Checklist.docx', kind: 'file', lastModified: '2026-01-09T02:09:07Z' },
      { name: 'Prodigy_Games_Task_Checklist 1.26.26.docx', kind: 'file', lastModified: '2026-01-26T22:36:21Z' },
      { name: 'Prodigy_Games_Welcome_Email.docx', kind: 'file', lastModified: '2026-01-09T02:10:26Z' },
      { name: 'ProfitandLoss Feb 2026.pdf', kind: 'file', lastModified: '2026-03-04T00:01:29Z' },
    ],
  },
  {
    client: 'Victory Contracting',
    clientCode: '',
    children: [
      { name: '01_Intake Docs', kind: 'folder', lastModified: '2026-02-03T21:51:57Z' },
      { name: '02_Financial Docs', kind: 'folder', lastModified: '2026-01-27T15:38:55Z' },
      { name: '03_Corporate Docs', kind: 'folder', lastModified: '2026-02-03T21:52:21Z' },
      { name: '04_Bank & AR Docs', kind: 'folder', lastModified: '2026-02-03T21:50:18Z' },
      { name: '05_Contracts & Invoice Docs', kind: 'folder', lastModified: '2026-02-03T21:51:50Z' },
      { name: '06_Lender Packages', kind: 'folder', lastModified: '2026-02-03T21:50:18Z' },
      { name: '07_Projects & Services', kind: 'folder', lastModified: '2026-01-27T17:40:11Z' },
      { name: '99_Internal (HVS only)', kind: 'folder', lastModified: '2026-01-27T15:38:52Z' },
    ],
  },
];

export function classifyRecoveredName(name: string, kind: 'file' | 'folder'): HvsDocumentClass {
  const n = name.toLowerCase();
  if (kind === 'folder') return 'structured_folder';
  if (n.includes('invoice')) return 'invoice';
  if (
    n.includes('sba') ||
    n.includes('funding checklist') ||
    n.includes('capital_acquisition') ||
    n.includes('capital acquisition') ||
    n.includes('pre approval')
  ) {
    return 'capital_package';
  }
  if (n.includes('hvcg engagement')) return 'engagement';
  if (
    n.includes('engagement agreement') ||
    n.includes('engagement_plan') ||
    n.includes('business development agreement') ||
    n.includes('operating_agreement') ||
    n.includes('operating agreement')
  ) {
    return 'agreement';
  }
  if (
    n.includes('profitandloss') ||
    n.includes('profit and loss') ||
    /\bpl\b/.test(n) ||
    n.includes('transaction detail')
  ) {
    return 'financial_statement';
  }
  if (n.includes('ein') || n.includes('articles of organization')) return 'formation';
  if (
    n.includes('onboarding') ||
    n.includes('welcome email') ||
    n.includes('next steps') ||
    n.includes('task_checklist') ||
    n.includes('cleanup_plan') ||
    n.includes('action_plan')
  ) {
    return 'onboarding';
  }
  if (n.includes('business plan') || n.includes('business_plan')) return 'plan';
  return 'unclassified';
}

export function hvsRecoveredDocuments(): HvsRecoveredDocument[] {
  return RAW.flatMap((row) =>
    row.children.map((child) => ({
      client: row.client,
      clientCode: row.clientCode,
      name: child.name,
      kind: child.kind,
      documentClass: classifyRecoveredName(child.name, child.kind),
      lastModified: child.lastModified,
      provenance: 'CONFIRMED' as const,
      amountsExtracted: false as const,
      binariesInAtlas: false as const,
    })),
  );
}

export function hvsRecoveredDocumentsFor(client: string): HvsRecoveredDocument[] {
  return hvsRecoveredDocuments().filter((row) => row.client === client);
}

export function hvsRecoveredDocumentSummary(client: string): {
  documentCount: number;
  fileCount: number;
  folderCount: number;
  documentClasses: HvsDocumentClass[];
  knowledgeIndexed: true;
} {
  const rows = hvsRecoveredDocumentsFor(client);
  return {
    documentCount: rows.length,
    fileCount: rows.filter((row) => row.kind === 'file').length,
    folderCount: rows.filter((row) => row.kind === 'folder').length,
    documentClasses: [...new Set(rows.map((row) => row.documentClass))],
    knowledgeIndexed: true,
  };
}

export function hvsRecoveredActions(): HvsRecoveredAction[] {
  return [
    {
      id: 'hvs-action:CCB01:review-sba-express',
      client: 'Colorado Beef',
      clientCode: 'CCB01',
      title:
        'Review recovered Colorado Beef SBA Express / HVCG engagement packet (filenames only; no invented terms)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED files: HVCG Engagement 7.20.26.pdf; SBA Express Loan Engagement Agreement; SBA Express Funding Checklist; Next Steps Instructions Letter',
    },
    {
      id: 'hvs-action:CCB01:decide-sba-next',
      client: 'Colorado Beef',
      clientCode: 'CCB01',
      title:
        'Decide next step on recovered Colorado Beef SBA Express packet (no invented lender criteria or amounts)',
      queue: 'Decision Required',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence: 'CONFIRMED SBA Express filenames dated 2026-07-20. Terms and funding status are not extracted.',
    },
    {
      id: 'hvs-action:CPL01:review-invoices',
      client: "Christie's Place",
      clientCode: 'CPL01',
      title:
        "Review recovered Christie's Place invoice filenames dated 6.19.26 (amounts not extracted)",
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence: "CONFIRMED files: Invoice for Christie's Place 6.19.26.pdf and part 2.pdf",
    },
    {
      id: 'hvs-action:Frocovery:review-formation',
      client: 'Frocovery',
      clientCode: '',
      title:
        'Review recovered Frocovery formation and business-development packet (no invented obligations)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED files: Articles of Organization; EIN; Operating Agreement; Business Development Agreement; Business Plan',
    },
    {
      id: 'hvs-action:PDG01:review-engagement-capital',
      client: 'Prodigy Games',
      clientCode: 'PDG01',
      title:
        'Review recovered Prodigy engagement, onboarding, and capital-acquisition packet (P&L filenames listed; balances not extracted)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED files: Prodigy_Games_Engagement_Plan.docx; Onboarding Checklist; Capital_Acquisition_Plan; P&L filenames remain in SharePoint',
    },
    {
      id: 'hvs-action:structured:ready-index',
      client: 'Recovered HVS structured folders',
      clientCode: '',
      title:
        'Structured first-level folders indexed for ACCG, Integrity Lift, Lien Partners, LV Appraisals, Victory, and Pierlo (child files not yet inventoried)',
      queue: 'Ready',
      kind: 'hvs_recovered_action',
      provenance: 'CONFIRMED',
      evidence: 'CONFIRMED first-level folder names only. No invented project completion.',
    },
  ];
}

export const HVS_RECOVERED_KIND = ['hvs_recovered_reference', 'hvs_recovered_action', 'hvs_recovered_document'] as const;

export function isHvsRecoveredKind(kind: string): boolean {
  return (HVS_RECOVERED_KIND as readonly string[]).includes(kind);
}
