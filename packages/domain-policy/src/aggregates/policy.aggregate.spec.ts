import { describe, it, expect } from 'vitest';
import { PolicyAggregate } from './policy.aggregate';
import { DomainEventMetadata } from '@agenticcore/shared';

const testMetadata: Omit<DomainEventMetadata, 'timestamp'> = {
  correlationId: 'test-correlation',
  actor: { type: 'system', id: 'test', name: 'Test' },
};

describe('PolicyAggregate', () => {
  it('should create a submission', () => {
    const aggregate = PolicyAggregate.createSubmission(
      'policy-1', 'account-1', 'personal-auto', 'personal-auto', '2026-03-01', testMetadata,
    );

    expect(aggregate.id).toBe('policy-1');
    expect(aggregate.accountId).toBe('account-1');
    expect(aggregate.productCode).toBe('personal-auto');
    expect(aggregate.status).toBe('draft');
    expect(aggregate.uncommittedEvents).toHaveLength(1);
  });

  it('should add risks', () => {
    const aggregate = PolicyAggregate.createSubmission(
      'policy-1', 'account-1', 'personal-auto', 'personal-auto', '2026-03-01', testMetadata,
    );

    const riskId = aggregate.addRisk('vehicle', { vin: '1HGBH41JXMN109186', year: 2024, make: 'Honda', model: 'Civic', usage: 'commute' }, testMetadata);

    expect(riskId).toBeDefined();
    expect(aggregate.risks).toHaveLength(1);
    expect(aggregate.risks[0]!.riskType).toBe('vehicle');
  });

  it('should select coverages', () => {
    const aggregate = PolicyAggregate.createSubmission(
      'policy-1', 'account-1', 'personal-auto', 'personal-auto', '2026-03-01', testMetadata,
    );

    const covId = aggregate.selectCoverage('liability', { amount: 100000, currency: 'USD' }, { amount: 0, currency: 'USD' }, testMetadata);

    expect(covId).toBeDefined();
    expect(aggregate.coverages).toHaveLength(1);
    expect(aggregate.coverages[0]!.coverageCode).toBe('liability');
  });

  it('should transition through submission workflow', () => {
    const aggregate = PolicyAggregate.createSubmission(
      'policy-1', 'account-1', 'personal-auto', 'personal-auto', '2026-03-01', testMetadata,
    );

    aggregate.addRisk('vehicle', { vin: '1HGBH41JXMN109186', year: 2024, make: 'Honda', model: 'Civic', usage: 'commute' }, testMetadata);
    aggregate.selectCoverage('liability', { amount: 100000, currency: 'USD' }, { amount: 0, currency: 'USD' }, testMetadata);

    aggregate.submit(testMetadata);
    expect(aggregate.status).toBe('submitted');

    aggregate.startUnderwritingReview('underwriter-1', 65, testMetadata);
    expect(aggregate.status).toBe('underwriting_review');

    aggregate.approveUnderwriting('underwriter-1', [], 'standard', testMetadata);
    expect(aggregate.status).toBe('quoted');
  });

  it('should handle full lifecycle through binding and issuance', () => {
    const aggregate = PolicyAggregate.createSubmission(
      'policy-1', 'account-1', 'personal-auto', 'personal-auto', '2026-03-01', testMetadata,
    );

    aggregate.submit(testMetadata);
    aggregate.startUnderwritingReview('uw-1', 50, testMetadata);
    aggregate.approveUnderwriting('uw-1', [], 'standard', testMetadata);
    aggregate.completeRating({ amount: 1500, currency: 'USD' }, {}, [], testMetadata);
    aggregate.generateQuote('QTE-001', { amount: 1500, currency: 'USD' }, '2026-04-01', testMetadata);
    aggregate.acceptAndBind(testMetadata);
    expect(aggregate.status).toBe('binding');

    aggregate.receivePayment(testMetadata);
    expect(aggregate.status).toBe('bound');

    aggregate.issuePolicy(['dec-page.pdf'], '2026-03-01', testMetadata);
    expect(aggregate.status).toBe('issued');

    aggregate.activatePolicy('2026-03-01', testMetadata);
    expect(aggregate.status).toBe('in_force');
  });

  it('should handle endorsement cycle', () => {
    const aggregate = createInForcePolicy();

    aggregate.requestEndorsement([{ field: 'vehicle', oldValue: 'Honda', newValue: 'Toyota' }], '2026-06-01', testMetadata);
    expect(aggregate.status).toBe('endorsement_pending');

    aggregate.applyEndorsement('END-001', { amount: 50, currency: 'USD' }, testMetadata);
    expect(aggregate.status).toBe('in_force');
    expect(aggregate.premium.amount).toBe(1550);
  });

  it('should handle cancellation and reinstatement', () => {
    const aggregate = createInForcePolicy();

    aggregate.requestCancellation('customer_request', '2026-06-01', 'customer', testMetadata);
    expect(aggregate.status).toBe('cancellation_pending');

    aggregate.approveCancellation({ amount: 500, currency: 'USD' }, testMetadata);
    expect(aggregate.status).toBe('cancelled');

    aggregate.approveReinstatement(['Payment of outstanding premium'], testMetadata);
    expect(aggregate.status).toBe('reinstated');
  });

  it('should throw on invalid state transition', () => {
    const aggregate = PolicyAggregate.createSubmission(
      'policy-1', 'account-1', 'personal-auto', 'personal-auto', '2026-03-01', testMetadata,
    );

    expect(() => aggregate.approveUnderwriting('uw-1', [], 'standard', testMetadata)).toThrow();
  });

  it('should rebuild from event history', () => {
    const original = PolicyAggregate.createSubmission(
      'policy-1', 'account-1', 'personal-auto', 'personal-auto', '2026-03-01', testMetadata,
    );
    original.addRisk('vehicle', { vin: 'ABC123' }, testMetadata);
    original.submit(testMetadata);

    const events = [...original.uncommittedEvents];

    const rebuilt = new PolicyAggregate('policy-1');
    rebuilt.loadFromHistory(events);

    expect(rebuilt.status).toBe('submitted');
    expect(rebuilt.risks).toHaveLength(1);
    expect(rebuilt.accountId).toBe('account-1');
  });
});

function createInForcePolicy(): PolicyAggregate {
  const aggregate = PolicyAggregate.createSubmission(
    'policy-1', 'account-1', 'personal-auto', 'personal-auto', '2026-03-01', testMetadata,
  );
  aggregate.submit(testMetadata);
  aggregate.startUnderwritingReview('uw-1', 50, testMetadata);
  aggregate.approveUnderwriting('uw-1', [], 'standard', testMetadata);
  aggregate.completeRating({ amount: 1500, currency: 'USD' }, {}, [], testMetadata);
  aggregate.generateQuote('QTE-001', { amount: 1500, currency: 'USD' }, '2026-04-01', testMetadata);
  aggregate.acceptAndBind(testMetadata);
  aggregate.receivePayment(testMetadata);
  aggregate.bindPolicy('POL-001', '2026-03-01', { amount: 1500, currency: 'USD' }, testMetadata);
  aggregate.issuePolicy(['dec-page.pdf'], '2026-03-01', testMetadata);
  aggregate.activatePolicy('2026-03-01', testMetadata);
  return aggregate;
}
