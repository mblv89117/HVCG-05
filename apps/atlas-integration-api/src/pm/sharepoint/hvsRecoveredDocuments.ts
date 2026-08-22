/**
 * HVS-admin document inventory for recovered client folders.
 *
 * Evidence: 2026-08-22 HVS-admin Graph Sites.Read.All / Files.Read.All.
 * First-level folders plus second-level operational filenames.
 * Metadata only — names, kinds, last-modified, and filename class.
 * Atlas does not copy binaries, extract balances, invent obligations,
 * or mint Hub MI HVCG_Clients rows. Tax-return and photo filenames are
 * classified, not listed as current operating evidence.
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
    n.includes('pre approval') ||
    n.includes('capital offer') ||
    n.includes('capital + acquisition') ||
    n.includes('strategic_capital') ||
    n.includes('financing_readiness')
  ) {
    return 'capital_package';
  }
  if (n.includes('hvcg engagement') || n.includes('engagement letter')) return 'engagement';
  if (
    n.includes('engagement agreement') ||
    n.includes('engagement_plan') ||
    n.includes('business development agreement') ||
    n.includes('operating_agreement') ||
    n.includes('operating agreement') ||
    n.includes('consulting agreement') ||
    n.includes('scope of work') ||
    n.includes('fractional_cfo_agreement') ||
    n.includes('bookkeeping_services_agreement')
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
  if (n.includes('business plan') || n.includes('business_plan') || n.includes('proposal') || n.includes('growth plan')) {
    return 'plan';
  }
  return 'unclassified';
}

/** Second-level operational filenames. Tax returns and photos omitted. */
const L2_OPERATIONAL: Array<{ client: string; clientCode: string; children: RawChild[] }> = [
  {
    client: 'ACCG Inc',
    clientCode: 'ACCG01',
    children: [
      { name: '05_Contracts & Invoice Docs/ACCG INC SCOPE OF WORK.xlsx', kind: 'file', lastModified: '2026-02-03T20:40:00Z' },
      { name: '05_Contracts & Invoice Docs/High value Solution LLC Access Plus Consulting Agreement.pdf', kind: 'file', lastModified: '2026-02-03T20:40:00Z' },
      { name: '07_Projects/ACCG_ROS_Proposal.pdf', kind: 'file', lastModified: '2026-02-03T20:40:35Z' },
      { name: '07_Projects/ACCG Buildout.pdf', kind: 'file', lastModified: '2026-02-03T20:40:35Z' },
      { name: '07_Projects/9497.00_Sanford Warehouse_6-18-2025_REV.pdf', kind: 'file', lastModified: '2026-02-03T20:40:35Z' },
      { name: '07_Projects/Consultant services for MEP\'s for 2705 Richmond ave.pdf', kind: 'file', lastModified: '2026-02-03T20:40:35Z' },
      { name: '07_Projects/Richmond Purchase.pdf', kind: 'file', lastModified: '2026-02-03T20:40:35Z' },
    ],
  },
  {
    client: 'Final Installment',
    clientCode: '',
    children: [
      { name: '01_Intake Docs', kind: 'folder', lastModified: '2026-02-03T21:08:31Z' },
      { name: '05_Contracts & Invoice Docs', kind: 'folder', lastModified: '2026-02-03T21:08:31Z' },
      { name: '01_Intake Docs/FinalInstallment_Intake_Checklist.pdf', kind: 'file', lastModified: '2026-02-03T21:08:31Z' },
      { name: '05_Contracts & Invoice Docs/Engagement Letter Final Install HVS 8.27.25.pdf', kind: 'file', lastModified: '2026-02-03T21:08:31Z' },
      { name: '05_Contracts & Invoice Docs/Engagement Letter Final Install HVS 8.27.25 esign.pdf', kind: 'file', lastModified: '2026-02-03T21:08:31Z' },
      { name: '05_Contracts & Invoice Docs/Final Install Capital Market Notes.docx', kind: 'file', lastModified: '2026-02-03T21:08:31Z' },
      { name: '05_Contracts & Invoice Docs/12.9.2025_Use of Proceeds.pdf', kind: 'file', lastModified: '2026-02-03T21:08:31Z' },
    ],
  },
  {
    client: 'Integrity Lift Solutions LLC',
    clientCode: '',
    children: [
      { name: '01_Intake Docs/Integrity Lift Solutions LLC Consulting Agreement 11.26.24 - signed.pdf', kind: 'file', lastModified: '2026-02-03T21:40:37Z' },
      { name: '01_Intake Docs/Task Checklist HVS Integrity Lift Solutions LLC 11.26.24.pdf', kind: 'file', lastModified: '2026-02-03T21:40:37Z' },
      { name: '02_Financial Docs/121 Capital offer for Integrity Lift Solutions LLC.pdf', kind: 'file', lastModified: '2026-02-03T21:48:00Z' },
      { name: '05_Contracts & Invoice Docs/HVS Invoice 11.27.24 Integrity Lift Solutions.pdf', kind: 'file', lastModified: '2026-02-03T21:47:23Z' },
    ],
  },
  {
    client: 'Lien Partners LLC',
    clientCode: 'LIEN01',
    children: [
      { name: '01_Intake Docs/CONSULTING AGREEMENT 6.12.25 HVS ENCS.docx', kind: 'file', lastModified: '2026-02-03T20:52:23Z' },
      { name: '01_Intake Docs/Re_ Lien Partners – Next Steps_ NDA, Referral Agreement, Draft Term Sheet & Intros.pdf', kind: 'file', lastModified: '2026-02-03T20:52:23Z' },
      { name: '01_Intake Docs/Ben Alleon Capital Partners.pdf', kind: 'file', lastModified: '2026-02-03T20:52:23Z' },
    ],
  },
  {
    client: 'LV Appraisals',
    clientCode: '',
    children: [
      { name: '03_Corporate Docs/Website updates.docx', kind: 'file', lastModified: '2026-01-27T15:38:55Z' },
      { name: '03_Corporate Docs/Home Page content.docx', kind: 'file', lastModified: '2026-01-27T15:38:55Z' },
      { name: '03_Corporate Docs/Las Vegas Appraisal Co Revised.docx', kind: 'file', lastModified: '2026-01-27T15:38:55Z' },
    ],
  },
  {
    client: 'Prodigy Games',
    clientCode: 'PDG01',
    children: [
      { name: '05_Contracts & Invoice Docs/HVS_Prodigy_Games_Fractional_CFO_Agreement - signed.pdf', kind: 'file', lastModified: '2026-01-27T19:51:21Z' },
      { name: '05_Contracts & Invoice Docs/Prodigy Games LLC April 2026 Past Due Invoice.pdf', kind: 'file', lastModified: '2026-01-27T19:51:21Z' },
      { name: '05_Contracts & Invoice Docs/Prodigy Games LLC May 2026 Past Due Invoice.pdf', kind: 'file', lastModified: '2026-01-27T19:51:21Z' },
      { name: '05_Contracts & Invoice Docs/Strategic_Capital_Agreement May 6 2026.pdf', kind: 'file', lastModified: '2026-01-27T19:51:21Z' },
      { name: '05_Contracts & Invoice Docs/Prodigy_ThatsKava_Bookkeeping_Services_Agreement_FL.docx', kind: 'file', lastModified: '2026-01-27T19:51:21Z' },
      { name: '07_Projects & Services/Prodigy Games KPI Strategy.pdf', kind: 'file', lastModified: '2026-01-27T19:51:21Z' },
    ],
  },
  {
    client: 'Victory Contracting',
    clientCode: '',
    children: [
      { name: '05_Contracts & Invoice Docs/Business Consulting Agreement High Value Solution LLC and Victory Contracting LLC - signed.pdf', kind: 'file', lastModified: '2026-02-03T21:51:50Z' },
      { name: '05_Contracts & Invoice Docs/HVS Application Victory Contracting LLC.pdf', kind: 'file', lastModified: '2026-02-03T21:51:50Z' },
      { name: '05_Contracts & Invoice Docs/Victory Contracting Business Plan 08.21.23.docx', kind: 'file', lastModified: '2026-02-03T21:51:50Z' },
      { name: '01_Intake Docs/Task Checklist 9.10.24.pdf', kind: 'file', lastModified: '2026-02-03T21:51:57Z' },
    ],
  },
];

function allRaw(): Array<{ client: string; clientCode: string; children: RawChild[] }> {
  return [...RAW, ...L2_OPERATIONAL];
}

export function hvsRecoveredDocuments(): HvsRecoveredDocument[] {
  const seen = new Set<string>();
  const out: HvsRecoveredDocument[] = [];
  for (const row of allRaw()) {
    for (const child of row.children) {
      const key = `${row.client}\0${child.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        client: row.client,
        clientCode: row.clientCode,
        name: child.name,
        kind: child.kind,
        documentClass: classifyRecoveredName(child.name, child.kind),
        lastModified: child.lastModified,
        provenance: 'CONFIRMED' as const,
        amountsExtracted: false as const,
        binariesInAtlas: false as const,
      });
    }
  }
  return out;
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
      id: 'hvs-action:ACCG01:review-sow-projects',
      client: 'ACCG Inc',
      clientCode: 'ACCG01',
      title:
        'Review recovered ACCG SOW, Access Plus consulting agreement, and project filenames (ROS, Sanford Warehouse, Richmond, Buildout)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED L2 files: ACCG INC SCOPE OF WORK.xlsx; High value Solution LLC Access Plus Consulting Agreement.pdf; ACCG_ROS_Proposal.pdf; Sanford Warehouse; Richmond Purchase; ACCG Buildout.pdf',
    },
    {
      id: 'hvs-action:ACCG01:decide-live-projects',
      client: 'ACCG Inc',
      clientCode: 'ACCG01',
      title:
        'Decide which recovered ACCG project filenames are still live work (no invented completion or obligations)',
      queue: 'Decision Required',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence: 'CONFIRMED 07_Projects filenames. Archive SBA packet is historical and not treated as current funding status.',
    },
    {
      id: 'hvs-action:FinalInstallment:review-engagement',
      client: 'Final Installment',
      clientCode: '',
      title:
        'Review recovered Final Installment HVS engagement 8.27.25 and capital-market notes (no invented deal terms)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED L2 files: Engagement Letter Final Install HVS 8.27.25.pdf; esign copy; Final Install Capital Market Notes.docx; Use of Proceeds.pdf',
    },
    {
      id: 'hvs-action:ILS:review-consulting',
      client: 'Integrity Lift Solutions LLC',
      clientCode: '',
      title:
        'Review recovered Integrity Lift signed consulting agreement 11.26.24 and invoice filenames (amounts not extracted)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED L2 files: Integrity Lift Solutions LLC Consulting Agreement 11.26.24 - signed.pdf; HVS Invoice 11.27.24; 121 Capital offer filename present — terms not extracted',
    },
    {
      id: 'hvs-action:Victory:review-consulting',
      client: 'Victory Contracting',
      clientCode: '',
      title: 'Review recovered Victory Contracting signed HVS consulting agreement (no invented obligations)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED L2 files: Business Consulting Agreement High Value Solution LLC and Victory Contracting LLC - signed.pdf; HVS Application; Business Plan 08.21.23.docx',
    },
    {
      id: 'hvs-action:LIEN01:review-next-steps',
      client: 'Lien Partners LLC',
      clientCode: 'LIEN01',
      title:
        'Review recovered Lien Partners consulting agreement 6.12.25 and next-steps NDA / draft term-sheet email (terms not extracted)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED L2 files: CONSULTING AGREEMENT 6.12.25 HVS ENCS.docx; Next Steps NDA, Referral Agreement, Draft Term Sheet & Intros.pdf',
    },
    {
      id: 'hvs-action:PDG01:review-cfo-invoices',
      client: 'Prodigy Games',
      clientCode: 'PDG01',
      title:
        'Review recovered Prodigy fractional-CFO agreement and past-due invoice filenames (amounts not extracted)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence:
        'CONFIRMED L2 files: HVS_Prodigy_Games_Fractional_CFO_Agreement - signed.pdf; April 2026 Past Due Invoice.pdf; May 2026 Past Due Invoice.pdf; Strategic_Capital_Agreement May 6 2026.pdf',
    },
    {
      id: 'hvs-action:PDG01:review-second-location',
      client: 'Prodigy Games',
      clientCode: 'PDG01',
      title:
        'Review recovered Prodigy second-location packet (sibling folder 2nd Location; not a second client)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence: 'CONFIRMED file: 4_Engagements / 00_Client Files / 2nd Location / Opening a Second Location for Prodigy.pdf',
    },
    {
      id: 'hvs-action:LVAppraisals:review-website',
      client: 'LV Appraisals',
      clientCode: '',
      title: 'Review recovered LV Appraisals website/content packet (no invented delivery status)',
      queue: 'Needs Action',
      kind: 'hvs_recovered_action',
      provenance: 'PROPOSED',
      evidence: 'CONFIRMED L2 files: Website updates.docx; Home Page content.docx; Las Vegas Appraisal Co Revised.docx',
    },
    {
      id: 'hvs-action:l2:ready-index',
      client: 'Recovered HVS structured folders',
      clientCode: '',
      title:
        'Second-level operational filenames inventoried for ACCG, Final Installment, Integrity Lift, Lien Partners, LV Appraisals, Victory, and Prodigy',
      queue: 'Ready',
      kind: 'hvs_recovered_action',
      provenance: 'CONFIRMED',
      evidence:
        'CONFIRMED L2 filenames only. Tax-return and photo filenames classified, not extracted. No invented project completion.',
    },
  ];
}

export const HVS_RECOVERED_KIND = ['hvs_recovered_reference', 'hvs_recovered_action', 'hvs_recovered_document'] as const;

export function isHvsRecoveredKind(kind: string): boolean {
  return (HVS_RECOVERED_KIND as readonly string[]).includes(kind);
}
