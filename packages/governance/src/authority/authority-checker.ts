export interface AuthorityLimit {
  id: string;
  agentType: string;
  action: string;
  maxAmount?: number;
  maxRiskScore?: number;
  requiresHumanApproval: boolean;
  escalateTo?: string;
}

export interface AuthorityCheckResult {
  allowed: boolean;
  reason?: string;
  requiresEscalation: boolean;
  escalateTo?: string;
}

export class AuthorityChecker {
  private limits: AuthorityLimit[] = [];

  loadLimits(limits: AuthorityLimit[]): void {
    this.limits = limits;
  }

  addLimit(limit: AuthorityLimit): void {
    this.limits.push(limit);
  }

  check(agentType: string, action: string, context: { amount?: number; riskScore?: number } = {}): AuthorityCheckResult {
    const limit = this.limits.find(l => l.agentType === agentType && l.action === action);

    if (!limit) {
      // No limit defined — default deny
      return {
        allowed: false,
        reason: `No authority limit defined for ${agentType}/${action}`,
        requiresEscalation: true,
        escalateTo: 'admin',
      };
    }

    if (limit.requiresHumanApproval) {
      return {
        allowed: false,
        reason: 'Human approval required for this action',
        requiresEscalation: true,
        escalateTo: limit.escalateTo || 'human_reviewer',
      };
    }

    if (limit.maxAmount !== undefined && context.amount !== undefined) {
      if (context.amount > limit.maxAmount) {
        return {
          allowed: false,
          reason: `Amount ${context.amount} exceeds authority limit ${limit.maxAmount}`,
          requiresEscalation: true,
          escalateTo: limit.escalateTo || 'senior_underwriter',
        };
      }
    }

    if (limit.maxRiskScore !== undefined && context.riskScore !== undefined) {
      if (context.riskScore > limit.maxRiskScore) {
        return {
          allowed: false,
          reason: `Risk score ${context.riskScore} exceeds authority limit ${limit.maxRiskScore}`,
          requiresEscalation: true,
          escalateTo: limit.escalateTo || 'senior_underwriter',
        };
      }
    }

    return { allowed: true, requiresEscalation: false };
  }

  getLimitsForAgent(agentType: string): AuthorityLimit[] {
    return this.limits.filter(l => l.agentType === agentType);
  }
}
