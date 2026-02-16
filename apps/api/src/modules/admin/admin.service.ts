import { Injectable } from '@nestjs/common';
import { AuditLogger, AuditEvent, AuthorityChecker, AuthorityLimit, RuleEngine, BusinessRule } from '@agenticcore/governance';

@Injectable()
export class AdminService {
  private auditLogger = new AuditLogger();
  private authorityChecker = new AuthorityChecker();
  private ruleEngine = new RuleEngine();
  private rules: BusinessRule[] = [];
  private limits: AuthorityLimit[] = [];

  constructor() {
    this.loadDefaults();
  }

  getAuditLog(filter?: {
    actorId?: string;
    action?: string;
    entityType?: string;
    decision?: string;
  }): AuditEvent[] {
    return this.auditLogger.getEvents(filter);
  }

  getRules(): BusinessRule[] {
    return this.rules;
  }

  updateRule(id: string, updates: Partial<BusinessRule>): BusinessRule | null {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.rules[idx] = { ...this.rules[idx]!, ...updates };
    this.ruleEngine.loadRules(this.rules);
    return this.rules[idx]!;
  }

  getAuthorityLimits(): AuthorityLimit[] {
    return this.limits;
  }

  updateAuthorityLimit(id: string, updates: Partial<AuthorityLimit>): AuthorityLimit | null {
    const idx = this.limits.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.limits[idx] = { ...this.limits[idx]!, ...updates };
    this.authorityChecker.loadLimits(this.limits);
    return this.limits[idx]!;
  }

  private loadDefaults(): void {
    this.rules = [
      {
        id: 'rule-1',
        name: 'High premium auto-escalate',
        category: 'authority',
        condition: { field: 'premium.amount', operator: 'gt', value: 50000 },
        action: { type: 'escalate', message: 'Premium exceeds $50,000 — requires senior review', escalateTo: 'senior_underwriter' },
        severity: 'block',
        active: true,
      },
      {
        id: 'rule-2',
        name: 'Decline requires human approval',
        category: 'underwriting',
        condition: { field: 'action', operator: 'eq', value: 'decline_submission' },
        action: { type: 'escalate', message: 'Declinations require human approval', escalateTo: 'senior_underwriter' },
        severity: 'block',
        active: true,
      },
      {
        id: 'rule-3',
        name: 'Cancellation compliance check',
        category: 'compliance',
        condition: { field: 'action', operator: 'eq', value: 'process_cancellation' },
        action: { type: 'warn', message: 'Ensure cancellation complies with state notice requirements' },
        severity: 'warning',
        active: true,
      },
    ];
    this.ruleEngine.loadRules(this.rules);

    this.limits = [
      { id: 'limit-1', agentType: 'underwriting', action: 'approve_submission', maxAmount: 50000, maxRiskScore: 80, requiresHumanApproval: false },
      { id: 'limit-2', agentType: 'underwriting', action: 'decline_submission', requiresHumanApproval: true, escalateTo: 'senior_underwriter' },
      { id: 'limit-3', agentType: 'rating', action: 'calculate_quote', requiresHumanApproval: false },
      { id: 'limit-4', agentType: 'policy-servicing', action: 'process_endorsement', maxAmount: 10000, requiresHumanApproval: false },
      { id: 'limit-5', agentType: 'policy-servicing', action: 'process_cancellation', requiresHumanApproval: true, escalateTo: 'manager' },
    ];
    this.authorityChecker.loadLimits(this.limits);
  }
}
