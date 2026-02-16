export * from './money';
export * from './address';
export * from './result';

export type EntityId = string;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export type ContactType = 'person' | 'organization';
export type PolicyStatus = 'draft' | 'submitted' | 'underwriting_review' | 'quoted' | 'declined' | 'binding' | 'bound' | 'issued' | 'in_force' | 'endorsement_pending' | 'renewal_pending' | 'cancellation_pending' | 'cancelled' | 'reinstated' | 'expired';
export type TransactionType = 'new_business' | 'endorsement' | 'renewal' | 'cancellation' | 'reinstatement';
export type RiskType = 'vehicle' | 'property' | 'driver';
export type ModifierType = 'scheduled' | 'unscheduled' | 'boolean' | 'date';
export type RuleSeverity = 'info' | 'warning' | 'block';
export type RuleCategory = 'underwriting' | 'rating' | 'compliance' | 'authority';
export type ActorType = 'agent' | 'human' | 'system';
export type EscalationLevel = 'low' | 'medium' | 'high';
