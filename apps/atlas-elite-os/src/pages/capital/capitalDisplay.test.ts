import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_STATUS } from '../../ui/statusLanguage.ts';
import {
  QUEUE_LABELS,
  WORK_QUEUES,
  formatAging,
  formatVerification,
  queueTone,
  readOpportunityQuery,
  titleFromToken,
} from './capitalDisplay.ts';

describe('Capital queue labels', () => {
  it('uses Title Case Atlas status language — not ALL CAPS', () => {
    assert.equal(QUEUE_LABELS.AWAITING_MANNY, ATLAS_STATUS.needsManny);
    assert.equal(QUEUE_LABELS.AWAITING_CLIENT, ATLAS_STATUS.waitingClient);
    assert.equal(QUEUE_LABELS.AWAITING_LENDER, ATLAS_STATUS.waitingLender);
    assert.equal(QUEUE_LABELS.READY_FOR_SUBMISSION, ATLAS_STATUS.readyForSubmission);
    assert.equal(QUEUE_LABELS.RFI_OVERDUE, ATLAS_STATUS.rfiOverdue);
    assert.equal(QUEUE_LABELS.OFFERS_RECEIVED, ATLAS_STATUS.termSheetReceived);
    assert.equal(QUEUE_LABELS.CLOSING, ATLAS_STATUS.closing);
    assert.equal(QUEUE_LABELS.FUNDED, ATLAS_STATUS.funded);
    assert.equal(QUEUE_LABELS.COMPLIANCE_REVIEW, ATLAS_STATUS.complianceReview);
    assert.equal(QUEUE_LABELS.NEEDS_ATTENTION, ATLAS_STATUS.needsAction);
    assert.equal(QUEUE_LABELS.AWAITING_MANNY, 'Needs Manny');
    assert.equal(QUEUE_LABELS.AWAITING_CLIENT, 'Waiting Client');
    assert.equal(QUEUE_LABELS.AWAITING_LENDER, 'Waiting Lender');
    assert.equal(QUEUE_LABELS.READY_FOR_SUBMISSION, 'Ready for Submission');
    assert.equal(QUEUE_LABELS.RFI_OVERDUE, 'RFI Overdue');
    assert.equal(QUEUE_LABELS.OFFERS_RECEIVED, 'Term Sheet Received');
    assert.equal(QUEUE_LABELS.CLOSING, 'Closing');
    assert.equal(QUEUE_LABELS.FUNDED, 'Funded');
    assert.equal(QUEUE_LABELS.COMPLIANCE_REVIEW, 'Compliance Review');
    assert.deepEqual(
      [...WORK_QUEUES],
      [
        'AWAITING_MANNY',
        'AWAITING_CLIENT',
        'AWAITING_LENDER',
        'READY_FOR_SUBMISSION',
        'RFI_OVERDUE',
        'OFFERS_RECEIVED',
        'CLOSING',
        'FUNDED',
        'COMPLIANCE_REVIEW',
        'NEEDS_ATTENTION',
      ],
    );
    for (const queue of WORK_QUEUES) {
      assert.notEqual(QUEUE_LABELS[queue], QUEUE_LABELS[queue].toUpperCase());
    }
  });

  it('reads /capital?opportunity= without treating blank or whitespace as an id', () => {
    assert.equal(readOpportunityQuery('?opportunity=cap-1'), 'cap-1');
    assert.equal(readOpportunityQuery('opportunity=cap-1&queue=all'), 'cap-1');
    assert.equal(readOpportunityQuery(new URLSearchParams('opportunity=cap-2')), 'cap-2');
    assert.equal(readOpportunityQuery('?opportunity='), null);
    assert.equal(readOpportunityQuery('?opportunity=%20%20'), null);
    assert.equal(readOpportunityQuery('?q=cap-1'), null);
    assert.equal(readOpportunityQuery(null), null);
    assert.equal(titleFromToken('AWAITING_MANNY'), ATLAS_STATUS.needsManny);
    assert.equal(titleFromToken('RFI_OVERDUE'), ATLAS_STATUS.rfiOverdue);
  });

  it('keeps queue tones aligned with Atlas status language', () => {
    assert.equal(queueTone('AWAITING_MANNY'), 'warning');
    assert.equal(queueTone('RFI_OVERDUE'), 'danger');
    assert.equal(queueTone('FUNDED'), 'success');
    assert.equal(queueTone('COMPLIANCE_REVIEW'), 'gold');
    assert.equal(queueTone('READY_FOR_SUBMISSION'), 'success');
  });

  it('humanizes enums without dumping ALL_CAPS tokens', () => {
    assert.equal(titleFromToken('PENDING'), 'Pending');
    assert.equal(titleFromToken('working_capital_loc'), 'Working Capital LOC');
    assert.equal(titleFromToken('BEST_FIT'), 'Best Fit');
    assert.equal(formatVerification('VERIFIED'), ATLAS_STATUS.verified);
    assert.equal(formatVerification('UNVERIFIED'), ATLAS_STATUS.unverified);
    assert.equal(formatAging(1, 'overdue'), `1 day · ${ATLAS_STATUS.overdue}`);
    assert.equal(formatAging(9, 'fresh'), '9 days · Fresh');
  });
});
