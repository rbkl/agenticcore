import { describe, it, expect } from 'vitest';
import { GovernanceEngine } from './compliance-monitor';
import { RuleEngine } from '../rules/rule-engine';
import { AuthorityChecker } from '../authority/authority-checker';
import { AuditLogger } from '../audit/audit-logger';

describe('GovernanceEngine', () => {
  function createEngine() {
    const ruleEngine = new RuleEngine();
    const authorityChecker = new AuthorityChecker();
    const auditLogger = new AuditLogger();

    ruleEngine.loadRules([
      {
        id: 'rule-1',
        name: 'High premium escalation',
        category: 'authority',
        condition: { field: 'premium', operator: 'gt', value: 50000 },
        action: { type: 'escalate', message: 'Premium exceeds $50,000' },
        severity: 'block',
        active: true,
      },
      {
        id: 'rule-2',
        name: 'Info only rule',
        category: 'compliance',
        condition: { field: 'stateCode', operator: 'eq', value: 'CA' },
        action: { type: 'log', message: 'California compliance noted' },
        severity: 'info',
        active: true,
      },
    ]);

    authorityChecker.loadLimits([
      { id: 'limit-1', agentType: 'underwriting', action: 'approve_submission', maxAmount: 50000, maxRiskScore: 80, requiresHumanApproval: false },
      { id: 'limit-2', agentType: 'underwriting', action: 'decline_submission', requiresHumanApproval: true, escalateTo: 'senior_underwriter' },
    ]);

    return { engine: new GovernanceEngine(ruleEngine, authorityChecker, auditLogger), auditLogger };
  }

  it('should approve action within limits', () => {
    const { engine } = createEngine();

    const result = engine.check({
      agentType: 'underwriting',
      agentId: 'uw-agent-1',
      agentName: 'Underwriting Agent',
      action: 'approve_submission',
      targetEntityType: 'submission',
      targetEntityId: 'sub-1',
      payload: { premium: 30000 },
      amount: 30000,
      riskScore: 50,
    });

    expect(result.allowed).toBe(true);
    expect(result.decision).toBe('approved');
  });

  it('should block when rule triggered', () => {
    const { engine } = createEngine();

    const result = engine.check({
      agentType: 'underwriting',
      agentId: 'uw-agent-1',
      agentName: 'Underwriting Agent',
      action: 'approve_submission',
      targetEntityType: 'submission',
      targetEntityId: 'sub-2',
      payload: { premium: 75000 },
      amount: 40000,
      riskScore: 50,
    });

    expect(result.allowed).toBe(false);
    expect(result.decision).toBe('blocked');
    expect(result.blockReasons.length).toBeGreaterThan(0);
  });

  it('should escalate when authority exceeded', () => {
    const { engine } = createEngine();

    const result = engine.check({
      agentType: 'underwriting',
      agentId: 'uw-agent-1',
      agentName: 'Underwriting Agent',
      action: 'approve_submission',
      targetEntityType: 'submission',
      targetEntityId: 'sub-3',
      payload: { premium: 30000 },
      amount: 30000,
      riskScore: 90,
    });

    expect(result.allowed).toBe(false);
    expect(result.decision).toBe('escalated');
    expect(result.escalateTo).toBeDefined();
  });

  it('should escalate when human approval required', () => {
    const { engine } = createEngine();

    const result = engine.check({
      agentType: 'underwriting',
      agentId: 'uw-agent-1',
      agentName: 'Underwriting Agent',
      action: 'decline_submission',
      targetEntityType: 'submission',
      targetEntityId: 'sub-4',
      payload: {},
    });

    expect(result.allowed).toBe(false);
    expect(result.decision).toBe('escalated');
    expect(result.escalateTo).toBe('senior_underwriter');
  });

  it('should create audit event for every check', () => {
    const { engine, auditLogger } = createEngine();

    engine.check({
      agentType: 'underwriting',
      agentId: 'uw-agent-1',
      agentName: 'Underwriting Agent',
      action: 'approve_submission',
      targetEntityType: 'submission',
      targetEntityId: 'sub-5',
      payload: { premium: 5000 },
      amount: 5000,
    });

    const events = auditLogger.getEvents();
    expect(events.length).toBe(1);
    expect(events[0]!.action).toBe('approve_submission');
    expect(events[0]!.actor.type).toBe('agent');
  });
});
