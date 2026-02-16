import { RuleEngine, RuleEngineContext, RuleEvaluationResult } from '../rules/rule-engine';
import { AuthorityChecker, AuthorityCheckResult } from '../authority/authority-checker';
import { AuditLogger, AuditEvent } from '../audit/audit-logger';
import { generateId } from '@agenticcore/shared';

export interface GovernanceCheckInput {
  agentType: string;
  agentId: string;
  agentName: string;
  action: string;
  targetEntityType: string;
  targetEntityId: string;
  payload: Record<string, unknown>;
  amount?: number;
  riskScore?: number;
  lobCode?: string;
  stateCode?: string;
}

export interface GovernanceCheckResult {
  allowed: boolean;
  decision: 'approved' | 'blocked' | 'escalated';
  ruleResults: RuleEvaluationResult[];
  authorityResult: AuthorityCheckResult;
  blockReasons: string[];
  escalateTo?: string;
  auditEventId: string;
}

export class GovernanceEngine {
  constructor(
    private ruleEngine: RuleEngine,
    private authorityChecker: AuthorityChecker,
    private auditLogger: AuditLogger,
  ) {}

  check(input: GovernanceCheckInput): GovernanceCheckResult {
    // 1. Evaluate business rules
    const ruleContext: RuleEngineContext = {
      agentType: input.agentType,
      action: input.action,
      payload: input.payload,
      lobCode: input.lobCode,
      stateCode: input.stateCode,
    };
    const ruleResults = this.ruleEngine.evaluate(ruleContext);

    // 2. Check authority limits
    const authorityResult = this.authorityChecker.check(input.agentType, input.action, {
      amount: input.amount,
      riskScore: input.riskScore,
    });

    // 3. Determine decision
    const blockReasons: string[] = [];
    let decision: 'approved' | 'blocked' | 'escalated' = 'approved';
    let escalateTo: string | undefined;

    const blockingRules = this.ruleEngine.getBlockingResults(ruleResults);
    if (blockingRules.length > 0) {
      decision = 'blocked';
      blockReasons.push(...blockingRules.map(r => r.message!));
    }

    if (!authorityResult.allowed) {
      if (authorityResult.requiresEscalation) {
        decision = decision === 'blocked' ? 'blocked' : 'escalated';
        escalateTo = authorityResult.escalateTo;
        blockReasons.push(authorityResult.reason!);
      }
    }

    const allowed = decision === 'approved';

    // 4. Log audit event
    const auditEventId = generateId();
    const auditEvent: AuditEvent = {
      id: auditEventId,
      timestamp: new Date(),
      actor: { type: 'agent', id: input.agentId, name: input.agentName },
      action: input.action,
      target: { entityType: input.targetEntityType, entityId: input.targetEntityId },
      input: input.payload,
      output: { allowed, decision, blockReasons },
      decision,
      rulesEvaluated: ruleResults.map(r => ({ ruleId: r.ruleId, result: r.triggered ? 'triggered' : 'passed' })),
    };
    this.auditLogger.log(auditEvent);

    return {
      allowed,
      decision,
      ruleResults,
      authorityResult,
      blockReasons,
      escalateTo,
      auditEventId,
    };
  }
}
