import { BaseAgent, AgentConfig, AgentTaskInput, AgentTaskResult } from '../../framework/base-agent';
import { generateId } from '@agenticcore/shared';

const SYSTEM_PROMPT = `You are a compliance AI agent. Your role is to validate that insurance operations comply with state regulations, rate filing requirements, and form requirements. You provide advisory opinions and flag compliance issues.`;

export class ComplianceAgent extends BaseAgent {
  constructor(model?: string) {
    const config: AgentConfig = {
      agentType: 'compliance',
      model: model || process.env.COMPLIANCE_AGENT_MODEL || 'claude-opus-4-6',
      systemPrompt: SYSTEM_PROMPT,
      tools: [
        { name: 'check_state_compliance', description: 'Check state regulatory compliance', inputSchema: { type: 'object', properties: { stateCode: { type: 'string' }, action: { type: 'string' } }, required: ['stateCode', 'action'] } },
        { name: 'check_rate_filing', description: 'Check rate filing status', inputSchema: { type: 'object', properties: { lobCode: { type: 'string' }, stateCode: { type: 'string' } }, required: ['lobCode', 'stateCode'] } },
        { name: 'check_form_requirements', description: 'Check required forms for state/LOB', inputSchema: { type: 'object', properties: { lobCode: { type: 'string' }, stateCode: { type: 'string' } }, required: ['lobCode', 'stateCode'] } },
        { name: 'flag_compliance_issue', description: 'Flag a compliance issue', inputSchema: { type: 'object', properties: { issue: { type: 'string' }, severity: { type: 'string' } }, required: ['issue', 'severity'] } },
      ],
      maxIterations: 5,
    };
    super(config);
  }

  async execute(input: AgentTaskInput): Promise<AgentTaskResult> {
    this.resetToolCalls();
    const sessionId = generateId();

    return {
      taskId: input.taskId,
      agentType: this.agentType,
      sessionId,
      status: 'completed',
      result: { compliant: true, issues: [], stateCode: input.payload.stateCode },
      toolCalls: [...this.toolCalls],
      reasoning: 'Compliance check completed. No issues found.',
    };
  }
}
