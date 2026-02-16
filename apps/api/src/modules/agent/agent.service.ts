import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  AgentOrchestrator,
  AgentTaskInput,
  AgentTaskResult,
  UnderwritingAgent,
  RatingAgent,
  PolicyServicingAgent,
  ComplianceAgent,
} from '@agenticcore/agents';
import { GovernanceEngine, RuleEngine, AuthorityChecker, AuditLogger } from '@agenticcore/governance';
import { generateId } from '@agenticcore/shared';

@Injectable()
export class AgentService implements OnModuleInit {
  private orchestrator = new AgentOrchestrator();
  private governanceEngine: GovernanceEngine;
  private auditLogger = new AuditLogger();
  private taskResults = new Map<string, AgentTaskResult>();
  private escalations = new Map<string, { taskId: string; agentType: string; reason: string; context: Record<string, unknown>; status: string }>();

  constructor() {
    const ruleEngine = new RuleEngine();
    const authorityChecker = new AuthorityChecker();
    this.governanceEngine = new GovernanceEngine(ruleEngine, authorityChecker, this.auditLogger);

    // Load default authority limits
    authorityChecker.loadLimits([
      { id: '1', agentType: 'underwriting', action: 'approve_submission', maxAmount: 50000, maxRiskScore: 80, requiresHumanApproval: false },
      { id: '2', agentType: 'underwriting', action: 'decline_submission', requiresHumanApproval: true, escalateTo: 'senior_underwriter' },
      { id: '3', agentType: 'rating', action: 'calculate_quote', requiresHumanApproval: false },
      { id: '4', agentType: 'policy-servicing', action: 'process_endorsement', maxAmount: 10000, requiresHumanApproval: false },
      { id: '5', agentType: 'policy-servicing', action: 'process_cancellation', requiresHumanApproval: true, escalateTo: 'manager' },
      { id: '6', agentType: 'compliance', action: 'check_compliance', requiresHumanApproval: false },
    ]);
  }

  onModuleInit() {
    this.orchestrator.registerAgent(new UnderwritingAgent());
    this.orchestrator.registerAgent(new RatingAgent());
    this.orchestrator.registerAgent(new PolicyServicingAgent());
    this.orchestrator.registerAgent(new ComplianceAgent());
  }

  async submitTask(agentType: string, taskType: string, payload: Record<string, unknown>): Promise<AgentTaskResult> {
    const taskId = generateId();
    const input: AgentTaskInput = { taskId, taskType, payload };

    // Governance check before executing
    const govResult = this.governanceEngine.check({
      agentType,
      agentId: `${agentType}-agent`,
      agentName: `${agentType} Agent`,
      action: taskType,
      targetEntityType: 'task',
      targetEntityId: taskId,
      payload,
      amount: payload.amount as number | undefined,
      riskScore: payload.riskScore as number | undefined,
      lobCode: payload.lobCode as string | undefined,
      stateCode: payload.stateCode as string | undefined,
    });

    if (!govResult.allowed && govResult.decision === 'blocked') {
      const result: AgentTaskResult = {
        taskId,
        agentType,
        sessionId: generateId(),
        status: 'failed',
        result: { blocked: true, reasons: govResult.blockReasons },
        toolCalls: [],
        reasoning: `Task blocked by governance: ${govResult.blockReasons.join(', ')}`,
      };
      this.taskResults.set(taskId, result);
      return result;
    }

    const result = await this.orchestrator.submitTask(agentType, input);
    this.taskResults.set(taskId, result);

    if (result.status === 'escalated' && result.escalation) {
      this.escalations.set(generateId(), {
        taskId,
        agentType,
        reason: result.escalation.reason,
        context: result.escalation.context,
        status: 'pending',
      });
    }

    return result;
  }

  getTaskResult(taskId: string): AgentTaskResult | undefined {
    return this.taskResults.get(taskId);
  }

  getEscalations() {
    return Array.from(this.escalations.entries()).map(([id, e]) => ({ id, ...e }));
  }

  resolveEscalation(escalationId: string, decision: string, notes: string) {
    const escalation = this.escalations.get(escalationId);
    if (!escalation) return null;
    escalation.status = 'resolved';
    return { id: escalationId, ...escalation, decision, notes };
  }

  getRegisteredAgents() {
    return this.orchestrator.getRegisteredAgentTypes();
  }
}
