/**
 * Recovered HVS projects inferred from CONFIRMED filenames.
 * Not Hub MI HVCG_Projects rows. No invented completion, balances, or obligations.
 */

import type { KnowledgeProvenance } from './knowledgeClassification.ts';

export type HvsRecoveredProject = {
  client: string;
  clientCode: string;
  title: string;
  provenance: Extract<KnowledgeProvenance, 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN'>;
  operationalized: false;
  hubMiAccessible: false;
  evidence: string;
  nextAction: string;
};

export function hvsRecoveredProjects(): HvsRecoveredProject[] {
  return [
    {
      client: 'ACCG Inc',
      clientCode: 'ACCG01',
      title: 'ACCG ROS / warehouse / Richmond / buildout packet',
      provenance: 'LIKELY',
      operationalized: false,
      hubMiAccessible: false,
      evidence:
        'CONFIRMED 07_Projects filenames: ACCG_ROS_Proposal.pdf; Sanford Warehouse; Richmond Purchase; ACCG Buildout.pdf; SCOPE OF WORK.xlsx',
      nextAction: 'Confirm which recovered project filenames are still live. Do not invent completion.',
    },
    {
      client: 'Final Installment',
      clientCode: '',
      title: 'HVS engagement 8.27.25',
      provenance: 'CONFIRMED',
      operationalized: false,
      hubMiAccessible: false,
      evidence: 'CONFIRMED Engagement Letter Final Install HVS 8.27.25.pdf and esign copy',
      nextAction: 'Review recovered engagement filenames. Do not invent capital-market terms.',
    },
    {
      client: 'Integrity Lift Solutions LLC',
      clientCode: '',
      title: 'HVS consulting engagement 11.26.24',
      provenance: 'CONFIRMED',
      operationalized: false,
      hubMiAccessible: false,
      evidence: 'CONFIRMED signed consulting agreement 11.26.24 and HVS Invoice 11.27.24 filenames',
      nextAction: 'Review recovered consulting/invoice filenames. Amounts are not extracted.',
    },
    {
      client: 'Victory Contracting',
      clientCode: '',
      title: 'HVS business consulting agreement',
      provenance: 'CONFIRMED',
      operationalized: false,
      hubMiAccessible: false,
      evidence: 'CONFIRMED signed Business Consulting Agreement High Value Solution LLC and Victory Contracting LLC',
      nextAction: 'Review recovered consulting agreement. Do not invent obligations.',
    },
    {
      client: 'Lien Partners LLC',
      clientCode: 'LIEN01',
      title: 'HVS consulting + next-steps packet 6.12.25',
      provenance: 'LIKELY',
      operationalized: false,
      hubMiAccessible: false,
      evidence: 'CONFIRMED CONSULTING AGREEMENT 6.12.25 HVS ENCS.docx and Next Steps NDA / draft term-sheet email',
      nextAction: 'Review recovered next-steps filenames. Term-sheet contents are not extracted.',
    },
    {
      client: 'Prodigy Games',
      clientCode: 'PDG01',
      title: 'Fractional CFO + capital / second-location work',
      provenance: 'LIKELY',
      operationalized: false,
      hubMiAccessible: false,
      evidence:
        'CONFIRMED signed Fractional CFO agreement; Strategic_Capital_Agreement May 6 2026.pdf; 2nd Location / Opening a Second Location for Prodigy.pdf',
      nextAction: 'Review recovered CFO, capital, and second-location filenames. Amounts are not extracted.',
    },
    {
      client: 'LV Appraisals',
      clientCode: '',
      title: 'Website / content packet',
      provenance: 'LIKELY',
      operationalized: false,
      hubMiAccessible: false,
      evidence: 'CONFIRMED Website updates.docx; Home Page content.docx; Las Vegas Appraisal Co Revised.docx',
      nextAction: 'Review recovered website filenames. Do not invent delivery status.',
    },
    {
      client: "That's Kava",
      clientCode: '',
      title: "That's Kava materials inside Prodigy folder",
      provenance: 'STALE_OR_UNCERTAIN',
      operationalized: false,
      hubMiAccessible: false,
      evidence:
        'CONFIRMED Prodigy_ThatsKava_Bookkeeping_Services_Agreement_FL.docx inside Prodigy Games / 05_Contracts. Not a standalone HVS client folder.',
      nextAction: 'Keep as related Prodigy material. Do not invent a Hub client row for That\'s Kava.',
    },
  ];
}
