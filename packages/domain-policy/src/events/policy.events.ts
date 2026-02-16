// Submission events
export interface SubmissionCreatedPayload {
  accountId: string;
  productCode: string;
  lobCode: string;
  effectiveDate: string;
}

export interface SubmissionDataUpdatedPayload {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface RiskAddedPayload {
  riskId: string;
  riskType: string;
  riskData: Record<string, unknown>;
}

export interface RiskRemovedPayload {
  riskId: string;
}

export interface CoverageSelectedPayload {
  coverageId: string;
  coverageCode: string;
  limit: { amount: number; currency: string };
  deductible: { amount: number; currency: string };
}

export interface CoverageRemovedPayload {
  coverageId: string;
  coverageCode: string;
}

// Underwriting events
export interface UnderwritingReviewStartedPayload {
  assignedTo: string;
  riskScore: number;
}

export interface UnderwritingApprovedPayload {
  approvedBy: string;
  conditions: string[];
  authorityLevel: string;
}

export interface UnderwritingDeclinedPayload {
  declinedBy: string;
  reasons: string[];
}

export interface UnderwritingReferredPayload {
  referredTo: string;
  referralReasons: string[];
}

// Rating/Quoting events
export interface RatingRequestedPayload {
  ratingInputs: Record<string, unknown>;
}

export interface RatingCompletedPayload {
  premium: { amount: number; currency: string };
  worksheet: Record<string, unknown>;
  ratingFactors: Array<{ name: string; value: number }>;
}

export interface QuoteGeneratedPayload {
  quoteNumber: string;
  premium: { amount: number; currency: string };
  expirationDate: string;
}

// Binding/Issuance events
export interface PolicyBoundPayload {
  policyNumber: string;
  effectiveDate: string;
  premium: { amount: number; currency: string };
}

export interface PolicyIssuedPayload {
  documents: string[];
  issuedDate: string;
}

export interface PolicyInForcePayload {
  effectiveDate: string;
}

// Mid-term events
export interface EndorsementRequestedPayload {
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  effectiveDate: string;
}

export interface EndorsementAppliedPayload {
  endorsementNumber: string;
  premiumChange: { amount: number; currency: string };
}

export interface RenewalInitiatedPayload {
  renewalDate: string;
  proposedChanges: Array<{ field: string; value: unknown }>;
}

export interface RenewalCompletedPayload {
  renewalPolicyNumber: string;
  newPremium: { amount: number; currency: string };
}

export interface CancellationRequestedPayload {
  reason: string;
  effectiveDate: string;
  requestedBy: string;
}

export interface CancellationAppliedPayload {
  refundAmount: { amount: number; currency: string };
}

export interface ReinstatementRequestedPayload {
  reason: string;
}

export interface ReinstatementAppliedPayload {
  conditions: string[];
}

// Event type constants
export const PolicyEventTypes = {
  SUBMISSION_CREATED: 'SubmissionCreated',
  SUBMISSION_DATA_UPDATED: 'SubmissionDataUpdated',
  RISK_ADDED: 'RiskAdded',
  RISK_REMOVED: 'RiskRemoved',
  COVERAGE_SELECTED: 'CoverageSelected',
  COVERAGE_REMOVED: 'CoverageRemoved',
  UNDERWRITING_REVIEW_STARTED: 'UnderwritingReviewStarted',
  UNDERWRITING_APPROVED: 'UnderwritingApproved',
  UNDERWRITING_DECLINED: 'UnderwritingDeclined',
  UNDERWRITING_REFERRED: 'UnderwritingReferred',
  RATING_REQUESTED: 'RatingRequested',
  RATING_COMPLETED: 'RatingCompleted',
  QUOTE_GENERATED: 'QuoteGenerated',
  POLICY_BOUND: 'PolicyBound',
  POLICY_ISSUED: 'PolicyIssued',
  POLICY_IN_FORCE: 'PolicyInForce',
  ENDORSEMENT_REQUESTED: 'EndorsementRequested',
  ENDORSEMENT_APPLIED: 'EndorsementApplied',
  RENEWAL_INITIATED: 'RenewalInitiated',
  RENEWAL_COMPLETED: 'RenewalCompleted',
  CANCELLATION_REQUESTED: 'CancellationRequested',
  CANCELLATION_APPLIED: 'CancellationApplied',
  REINSTATEMENT_REQUESTED: 'ReinstatementRequested',
  REINSTATEMENT_APPLIED: 'ReinstatementApplied',
} as const;
