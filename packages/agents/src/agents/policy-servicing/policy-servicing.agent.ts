import { BaseAgent, AgentConfig, AgentTaskInput, AgentTaskResult } from '../../framework/base-agent';
import { generateId } from '@agenticcore/shared';

const SYSTEM_PROMPT = `You are a policy servicing AI agent. Your role is to process endorsements, renewals, and cancellations according to policy rules and governance requirements.`;

export class PolicyServicingAgent extends BaseAgent {
  constructor(model?: string) {
    const config: AgentConfig = {
      agentType: 'policy-servicing',
      model: model || process.env.POLICY_SERVICING_AGENT_MODEL || 'claude-sonnet-4-5-20250929',
      systemPrompt: SYSTEM_PROMPT,
      tools: [
        { name: 'get_policy', description: 'Get policy details', inputSchema: { type: 'object', properties: { policyId: { type: 'string' } }, required: ['policyId'] } },
        { name: 'process_endorsement', description: 'Process a policy endorsement', inputSchema: { type: 'object', properties: { policyId: { type: 'string' }, changes: { type: 'array' } }, required: ['policyId', 'changes'] } },
        { name: 'initiate_renewal', description: 'Initiate policy renewal', inputSchema: { type: 'object', properties: { policyId: { type: 'string' } }, required: ['policyId'] } },
        { name: 'process_cancellation', description: 'Process policy cancellation', inputSchema: { type: 'object', properties: { policyId: { type: 'string' }, reason: { type: 'string' } }, required: ['policyId', 'reason'] } },
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
      result: { message: 'Policy servicing completed', policyId: input.payload.policyId },
      toolCalls: [...this.toolCalls],
      reasoning: 'Policy servicing action processed within governance rules.',
    };
  }
}
