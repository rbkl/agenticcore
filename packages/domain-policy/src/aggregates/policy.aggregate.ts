import {
  AggregateRoot,
  DomainEvent,
  DomainEventMetadata,
  Money,
  createMoney,
  zeroMoney,
  addMoney,
  generateId,
  InvalidStateTransitionError,
} from '@agenticcore/shared';
import { PolicyEventTypes } from '../events/policy.events';
import type {
  SubmissionCreatedPayload,
  RiskAddedPayload,
  RiskRemovedPayload,
  CoverageSelectedPayload,
  CoverageRemovedPayload,
  UnderwritingApprovedPayload,
  UnderwritingDeclinedPayload,
  UnderwritingReferredPayload,
  RatingCompletedPayload,
  QuoteGeneratedPayload,
  PolicyBoundPayload,
  PolicyIssuedPayload,
  EndorsementRequestedPayload,
  EndorsementAppliedPayload,
  CancellationRequestedPayload,
  CancellationAppliedPayload,
  ReinstatementAppliedPayload,
} from '../events/policy.events';
import { PolicyLifecycleState, canTransition } from '../state-machine/policy-lifecycle';

interface PolicyRisk {
  id: string;
  riskType: string;
  data: Record<string, unknown>;
}

interface PolicyCoverage {
  id: string;
  coverageCode: string;
  limit: Money;
  deductible: Money;
  premium: Money;
}

export class PolicyAggregate extends AggregateRoot {
  private _accountId = '';
  private _productCode = '';
  private _lobCode = '';
  private _status: PolicyLifecycleState = 'draft';
  private _effectiveDate = '';
  private _expirationDate = '';
  private _policyNumber = '';
  private _quoteNumber = '';
  private _premium: Money = zeroMoney();
  private _risks: PolicyRisk[] = [];
  private _coverages: PolicyCoverage[] = [];
  private _underwritingConditions: string[] = [];
  private _declineReasons: string[] = [];

  get accountId() { return this._accountId; }
  get productCode() { return this._productCode; }
  get lobCode() { return this._lobCode; }
  get status() { return this._status; }
  get effectiveDate() { return this._effectiveDate; }
  get expirationDate() { return this._expirationDate; }
  get policyNumber() { return this._policyNumber; }
  get quoteNumber() { return this._quoteNumber; }
  get premium() { return this._premium; }
  get risks() { return [...this._risks]; }
  get coverages() { return [...this._coverages]; }

  protected getAggregateType(): string {
    return 'Policy';
  }

  // --- Commands ---

  static createSubmission(
    id: string,
    accountId: string,
    productCode: string,
    lobCode: string,
    effectiveDate: string,
    metadata: Omit<DomainEventMetadata, 'timestamp'>,
  ): PolicyAggregate {
    const aggregate = new PolicyAggregate(id);
    aggregate.apply(PolicyEventTypes.SUBMISSION_CREATED, {
      accountId, productCode, lobCode, effectiveDate,
    } satisfies SubmissionCreatedPayload as unknown as Record<string, unknown>, metadata);
    return aggregate;
  }

  addRisk(riskType: string, riskData: Record<string, unknown>, metadata: Omit<DomainEventMetadata, 'timestamp'>): string {
    const riskId = generateId();
    this.apply(PolicyEventTypes.RISK_ADDED, {
      riskId, riskType, riskData,
    } satisfies RiskAddedPayload as unknown as Record<string, unknown>, metadata);
    return riskId;
  }

  removeRisk(riskId: string, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.apply(PolicyEventTypes.RISK_REMOVED, {
      riskId,
    } satisfies RiskRemovedPayload as unknown as Record<string, unknown>, metadata);
  }

  selectCoverage(
    coverageCode: string,
    limit: Money,
    deductible: Money,
    metadata: Omit<DomainEventMetadata, 'timestamp'>,
  ): string {
    const coverageId = generateId();
    this.apply(PolicyEventTypes.COVERAGE_SELECTED, {
      coverageId, coverageCode, limit, deductible,
    } satisfies CoverageSelectedPayload as unknown as Record<string, unknown>, metadata);
    return coverageId;
  }

  removeCoverage(coverageId: string, coverageCode: string, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.apply(PolicyEventTypes.COVERAGE_REMOVED, {
      coverageId, coverageCode,
    } satisfies CoverageRemovedPayload as unknown as Record<string, unknown>, metadata);
  }

  submit(metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('SUBMIT');
    this.apply('Submitted', {}, metadata);
  }

  startUnderwritingReview(assignedTo: string, riskScore: number, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('START_UNDERWRITING');
    this.apply(PolicyEventTypes.UNDERWRITING_REVIEW_STARTED, {
      assignedTo, riskScore,
    } as unknown as Record<string, unknown>, metadata);
  }

  approveUnderwriting(approvedBy: string, conditions: string[], authorityLevel: string, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('APPROVE_UNDERWRITING');
    this.apply(PolicyEventTypes.UNDERWRITING_APPROVED, {
      approvedBy, conditions, authorityLevel,
    } satisfies UnderwritingApprovedPayload as unknown as Record<string, unknown>, metadata);
  }

  declineUnderwriting(declinedBy: string, reasons: string[], metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('DECLINE_UNDERWRITING');
    this.apply(PolicyEventTypes.UNDERWRITING_DECLINED, {
      declinedBy, reasons,
    } satisfies UnderwritingDeclinedPayload as unknown as Record<string, unknown>, metadata);
  }

  referUnderwriting(referredTo: string, reasons: string[], metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('REFER_UNDERWRITING');
    this.apply(PolicyEventTypes.UNDERWRITING_REFERRED, {
      referredTo, referralReasons: reasons,
    } satisfies UnderwritingReferredPayload as unknown as Record<string, unknown>, metadata);
  }

  completeRating(premium: Money, worksheet: Record<string, unknown>, ratingFactors: Array<{ name: string; value: number }>, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.apply(PolicyEventTypes.RATING_COMPLETED, {
      premium, worksheet, ratingFactors,
    } satisfies RatingCompletedPayload as unknown as Record<string, unknown>, metadata);
  }

  generateQuote(quoteNumber: string, premium: Money, expirationDate: string, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.apply(PolicyEventTypes.QUOTE_GENERATED, {
      quoteNumber, premium, expirationDate,
    } satisfies QuoteGeneratedPayload as unknown as Record<string, unknown>, metadata);
  }

  acceptAndBind(metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('CUSTOMER_ACCEPT');
    this.apply('CustomerAccepted', {}, metadata);
  }

  receivePayment(metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('RECEIVE_PAYMENT');
    this.apply('PaymentReceived', {}, metadata);
  }

  bindPolicy(policyNumber: string, effectiveDate: string, premium: Money, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.apply(PolicyEventTypes.POLICY_BOUND, {
      policyNumber, effectiveDate, premium,
    } satisfies PolicyBoundPayload as unknown as Record<string, unknown>, metadata);
  }

  issuePolicy(documents: string[], issuedDate: string, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('ISSUE_POLICY');
    this.apply(PolicyEventTypes.POLICY_ISSUED, {
      documents, issuedDate,
    } satisfies PolicyIssuedPayload as unknown as Record<string, unknown>, metadata);
  }

  activatePolicy(effectiveDate: string, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('ACTIVATE_POLICY');
    this.apply(PolicyEventTypes.POLICY_IN_FORCE, {
      effectiveDate,
    } as unknown as Record<string, unknown>, metadata);
  }

  requestEndorsement(changes: EndorsementRequestedPayload['changes'], effectiveDate: string, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('REQUEST_ENDORSEMENT');
    this.apply(PolicyEventTypes.ENDORSEMENT_REQUESTED, {
      changes, effectiveDate,
    } satisfies EndorsementRequestedPayload as unknown as Record<string, unknown>, metadata);
  }

  applyEndorsement(endorsementNumber: string, premiumChange: Money, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('COMPLETE_ENDORSEMENT');
    this.apply(PolicyEventTypes.ENDORSEMENT_APPLIED, {
      endorsementNumber, premiumChange,
    } satisfies EndorsementAppliedPayload as unknown as Record<string, unknown>, metadata);
  }

  requestCancellation(reason: string, effectiveDate: string, requestedBy: string, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('REQUEST_CANCELLATION');
    this.apply(PolicyEventTypes.CANCELLATION_REQUESTED, {
      reason, effectiveDate, requestedBy,
    } satisfies CancellationRequestedPayload as unknown as Record<string, unknown>, metadata);
  }

  approveCancellation(refundAmount: Money, metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('APPROVE_CANCELLATION');
    this.apply(PolicyEventTypes.CANCELLATION_APPLIED, {
      refundAmount,
    } satisfies CancellationAppliedPayload as unknown as Record<string, unknown>, metadata);
  }

  approveReinstatement(conditions: string[], metadata: Omit<DomainEventMetadata, 'timestamp'>): void {
    this.assertTransition('APPROVE_REINSTATEMENT');
    this.apply(PolicyEventTypes.REINSTATEMENT_APPLIED, {
      conditions,
    } satisfies ReinstatementAppliedPayload as unknown as Record<string, unknown>, metadata);
  }

  // --- Event Handlers ---

  protected onEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case PolicyEventTypes.SUBMISSION_CREATED: {
        const p = event.payload as unknown as SubmissionCreatedPayload;
        this._accountId = p.accountId;
        this._productCode = p.productCode;
        this._lobCode = p.lobCode;
        this._effectiveDate = p.effectiveDate;
        this._status = 'draft';
        break;
      }
      case PolicyEventTypes.RISK_ADDED: {
        const p = event.payload as unknown as RiskAddedPayload;
        this._risks.push({ id: p.riskId, riskType: p.riskType, data: p.riskData });
        break;
      }
      case PolicyEventTypes.RISK_REMOVED: {
        const p = event.payload as unknown as RiskRemovedPayload;
        this._risks = this._risks.filter(r => r.id !== p.riskId);
        break;
      }
      case PolicyEventTypes.COVERAGE_SELECTED: {
        const p = event.payload as unknown as CoverageSelectedPayload;
        this._coverages.push({
          id: p.coverageId,
          coverageCode: p.coverageCode,
          limit: p.limit,
          deductible: p.deductible,
          premium: zeroMoney(),
        });
        break;
      }
      case PolicyEventTypes.COVERAGE_REMOVED: {
        const p = event.payload as unknown as CoverageRemovedPayload;
        this._coverages = this._coverages.filter(c => c.id !== p.coverageId);
        break;
      }
      case 'Submitted':
        this._status = 'submitted';
        break;
      case PolicyEventTypes.UNDERWRITING_REVIEW_STARTED:
        this._status = 'underwriting_review';
        break;
      case PolicyEventTypes.UNDERWRITING_APPROVED: {
        const p = event.payload as unknown as UnderwritingApprovedPayload;
        this._status = 'quoted';
        this._underwritingConditions = p.conditions;
        break;
      }
      case PolicyEventTypes.UNDERWRITING_DECLINED: {
        const p = event.payload as unknown as UnderwritingDeclinedPayload;
        this._status = 'declined';
        this._declineReasons = p.reasons;
        break;
      }
      case PolicyEventTypes.UNDERWRITING_REFERRED:
        break;
      case PolicyEventTypes.RATING_COMPLETED: {
        const p = event.payload as unknown as RatingCompletedPayload;
        this._premium = p.premium;
        break;
      }
      case PolicyEventTypes.QUOTE_GENERATED: {
        const p = event.payload as unknown as QuoteGeneratedPayload;
        this._quoteNumber = p.quoteNumber;
        break;
      }
      case 'CustomerAccepted':
        this._status = 'binding';
        break;
      case 'PaymentReceived':
        this._status = 'bound';
        break;
      case PolicyEventTypes.POLICY_BOUND: {
        const p = event.payload as unknown as PolicyBoundPayload;
        this._policyNumber = p.policyNumber;
        this._premium = p.premium;
        this._status = 'bound';
        break;
      }
      case PolicyEventTypes.POLICY_ISSUED:
        this._status = 'issued';
        break;
      case PolicyEventTypes.POLICY_IN_FORCE:
        this._status = 'in_force';
        break;
      case PolicyEventTypes.ENDORSEMENT_REQUESTED:
        this._status = 'endorsement_pending';
        break;
      case PolicyEventTypes.ENDORSEMENT_APPLIED: {
        const p = event.payload as unknown as EndorsementAppliedPayload;
        this._premium = addMoney(this._premium, p.premiumChange);
        this._status = 'in_force';
        break;
      }
      case PolicyEventTypes.CANCELLATION_REQUESTED:
        this._status = 'cancellation_pending';
        break;
      case PolicyEventTypes.CANCELLATION_APPLIED:
        this._status = 'cancelled';
        break;
      case PolicyEventTypes.REINSTATEMENT_APPLIED:
        this._status = 'reinstated';
        break;
      case PolicyEventTypes.RENEWAL_COMPLETED:
        this._status = 'in_force';
        break;
    }
  }

  private assertTransition(eventType: string): void {
    if (!canTransition(this._status, eventType)) {
      throw new InvalidStateTransitionError(this._status, eventType);
    }
  }

  toSnapshot(): Record<string, unknown> {
    return {
      accountId: this._accountId,
      productCode: this._productCode,
      lobCode: this._lobCode,
      status: this._status,
      effectiveDate: this._effectiveDate,
      expirationDate: this._expirationDate,
      policyNumber: this._policyNumber,
      quoteNumber: this._quoteNumber,
      premium: this._premium,
      risks: this._risks,
      coverages: this._coverages,
      underwritingConditions: this._underwritingConditions,
      declineReasons: this._declineReasons,
    };
  }
}
