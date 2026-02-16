export class DomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, id: string) {
    super('NOT_FOUND', `${entityType} with id ${id} not found`, { entityType, id });
    this.name = 'NotFoundError';
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(currentState: string, requestedTransition: string) {
    super('INVALID_STATE_TRANSITION', `Cannot transition from ${currentState} via ${requestedTransition}`, {
      currentState,
      requestedTransition,
    });
    this.name = 'InvalidStateTransitionError';
  }
}

export class AuthorityLimitExceededError extends DomainError {
  constructor(agentType: string, action: string, details?: Record<string, unknown>) {
    super('AUTHORITY_LIMIT_EXCEEDED', `Agent ${agentType} does not have authority for action ${action}`, {
      agentType,
      action,
      ...details,
    });
    this.name = 'AuthorityLimitExceededError';
  }
}

export class GovernanceBlockedError extends DomainError {
  constructor(ruleId: string, reason: string) {
    super('GOVERNANCE_BLOCKED', `Action blocked by governance rule ${ruleId}: ${reason}`, {
      ruleId,
      reason,
    });
    this.name = 'GovernanceBlockedError';
  }
}

export class ConcurrencyError extends DomainError {
  constructor(aggregateId: string, expectedVersion: number, actualVersion: number) {
    super('CONCURRENCY_ERROR', `Concurrency conflict on aggregate ${aggregateId}`, {
      aggregateId,
      expectedVersion,
      actualVersion,
    });
    this.name = 'ConcurrencyError';
  }
}
