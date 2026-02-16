import { BaseAgent, AgentConfig, AgentTaskInput, AgentTaskResult } from '../../framework/base-agent';
import { ToolRegistry } from '../../framework/tool-registry';
import { generateId } from '@agenticcore/shared';

const UNDERWRITING_TOOLS = [
  { name: 'get_submission', description: 'Retrieve submission details', inputSchema: { type: 'object', properties: { submissionId: { type: 'string' } }, required: ['submissionId'] } },
  { name: 'get_risk_score', description: 'Calculate risk score for submission', inputSchema: { type: 'object', properties: { submissionId: { type: 'string' } }, required: ['submissionId'] } },
  { name: 'get_loss_history', description: 'Retrieve applicant loss history', inputSchema: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] } },
  { name: 'approve_submission', description: 'Approve submission for quoting', inputSchema: { type: 'object', properties: { submissionId: { type: 'string' }, conditions: { type: 'array', items: { type: 'string' } } }, required: ['submissionId'] } },
  { name: 'decline_submission', description: 'Decline submission with reasons', inputSchema: { type: 'object', properties: { submissionId: { type: 'string' }, reasons: { type: 'array', items: { type: 'string' } } }, required: ['submissionId', 'reasons'] } },
  { name: 'refer_submission', description: 'Refer to senior underwriter', inputSchema: { type: 'object', properties: { submissionId: { type: 'string' }, reasons: { type: 'array', items: { type: 'string' } } }, required: ['submissionId', 'reasons'] } },
  { name: 'add_condition', description: 'Add underwriting condition', inputSchema: { type: 'object', properties: { submissionId: { type: 'string' }, condition: { type: 'string' } }, required: ['submissionId', 'condition'] } },
  { name: 'request_information', description: 'Request additional info from applicant', inputSchema: { type: 'object', properties: { submissionId: { type: 'string' }, infoNeeded: { type: 'string' } }, required: ['submissionId', 'infoNeeded'] } },
  { name: 'get_authority_limits', description: 'Check current authority limits', inputSchema: { type: 'object', properties: {} } },
];

const SYSTEM_PROMPT = `You are an expert insurance underwriter AI agent. Your role is to evaluate insurance submissions and make underwriting decisions.

When evaluating a submission:
1. First retrieve the submission details
2. Calculate the risk score
3. Check the loss history
4. Verify your authority limits
5. Make a decision: approve, decline, or refer

Decision guidelines:
- Approve if risk score is acceptable and within your authority limits
- Decline if risk score is too high or the applicant has excessive losses
- Refer to senior underwriter if the case is borderline or exceeds your authority

Always provide clear reasoning for your decisions.`;

export class UnderwritingAgent extends BaseAgent {
  private toolRegistry: ToolRegistry;

  constructor(model?: string) {
    const config: AgentConfig = {
      agentType: 'underwriting',
      model: model || process.env.UNDERWRITING_AGENT_MODEL || 'claude-opus-4-6',
      systemPrompt: SYSTEM_PROMPT,
      tools: UNDERWRITING_TOOLS,
      maxIterations: 10,
      temperature: 0.3,
    };
    super(config);
    this.toolRegistry = new ToolRegistry();
    this.registerDefaultTools();
  }

  async execute(input: AgentTaskInput): Promise<AgentTaskResult> {
    this.resetToolCalls();
    const sessionId = generateId();

    try {
      // Simulated agent execution loop
      const submissionId = input.payload.submissionId as string;

      // Step 1: Get submission
      const submission = await this.toolRegistry.execute('get_submission', { submissionId });
      this.recordToolCall({ toolName: 'get_submission', input: { submissionId }, output: submission, timestamp: new Date() });

      // Step 2: Get risk score
      const riskScore = await this.toolRegistry.execute('get_risk_score', { submissionId });
      this.recordToolCall({ toolName: 'get_risk_score', input: { submissionId }, output: riskScore, timestamp: new Date() });

      // Step 3: Check authority
      const authority = await this.toolRegistry.execute('get_authority_limits', {});
      this.recordToolCall({ toolName: 'get_authority_limits', input: {}, output: authority, timestamp: new Date() });

      // Step 4: Make decision based on risk score
      const score = (riskScore as { score: number }).score;
      const maxScore = (authority as { maxRiskScore: number }).maxRiskScore;

      if (score <= maxScore * 0.7) {
        // Approve
        const result = await this.toolRegistry.execute('approve_submission', { submissionId, conditions: [] });
        this.recordToolCall({ toolName: 'approve_submission', input: { submissionId, conditions: [] }, output: result, timestamp: new Date() });

        return {
          taskId: input.taskId,
          agentType: this.agentType,
          sessionId,
          status: 'completed',
          result: { decision: 'approved', submissionId, riskScore: score },
          toolCalls: [...this.toolCalls],
          reasoning: `Submission approved. Risk score ${score} is well within authority limit of ${maxScore}.`,
        };
      } else if (score > maxScore) {
        // Refer to senior
        const result = await this.toolRegistry.execute('refer_submission', {
          submissionId,
          reasons: [`Risk score ${score} exceeds authority limit ${maxScore}`],
        });
        this.recordToolCall({ toolName: 'refer_submission', input: { submissionId }, output: result, timestamp: new Date() });

        return {
          taskId: input.taskId,
          agentType: this.agentType,
          sessionId,
          status: 'escalated',
          result: { decision: 'referred', submissionId, riskScore: score },
          toolCalls: [...this.toolCalls],
          reasoning: `Submission referred. Risk score ${score} exceeds authority limit ${maxScore}.`,
          escalation: {
            reason: `Risk score ${score} exceeds authority limit ${maxScore}`,
            escalateTo: 'senior_underwriter',
            context: { submissionId, riskScore: score },
          },
        };
      } else {
        // Approve with conditions
        const conditions = ['Additional documentation required', 'Subject to inspection'];
        const result = await this.toolRegistry.execute('approve_submission', { submissionId, conditions });
        this.recordToolCall({ toolName: 'approve_submission', input: { submissionId, conditions }, output: result, timestamp: new Date() });

        return {
          taskId: input.taskId,
          agentType: this.agentType,
          sessionId,
          status: 'completed',
          result: { decision: 'approved_with_conditions', submissionId, riskScore: score, conditions },
          toolCalls: [...this.toolCalls],
          reasoning: `Submission approved with conditions. Risk score ${score} is within limits but elevated.`,
        };
      }
    } catch (error) {
      return {
        taskId: input.taskId,
        agentType: this.agentType,
        sessionId,
        status: 'failed',
        result: { error: String(error) },
        toolCalls: [...this.toolCalls],
        reasoning: `Underwriting failed: ${error}`,
      };
    }
  }

  private registerDefaultTools(): void {
    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'get_submission')!,
      async (input) => ({
        submissionId: input.submissionId,
        status: 'submitted',
        productCode: 'personal-auto',
        lobCode: 'personal-auto',
        premium: { amount: 1500, currency: 'USD' },
      }),
    );

    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'get_risk_score')!,
      async () => ({ score: 65, factors: ['clean_driving_record', 'new_vehicle'] }),
    );

    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'get_loss_history')!,
      async () => ({ claims: [], totalLosses: 0 }),
    );

    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'approve_submission')!,
      async (input) => ({ approved: true, submissionId: input.submissionId, conditions: input.conditions || [] }),
    );

    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'decline_submission')!,
      async (input) => ({ declined: true, submissionId: input.submissionId, reasons: input.reasons }),
    );

    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'refer_submission')!,
      async (input) => ({ referred: true, submissionId: input.submissionId, reasons: input.reasons }),
    );

    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'add_condition')!,
      async (input) => ({ added: true, condition: input.condition }),
    );

    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'request_information')!,
      async (input) => ({ requested: true, infoNeeded: input.infoNeeded }),
    );

    this.toolRegistry.register(
      UNDERWRITING_TOOLS.find(t => t.name === 'get_authority_limits')!,
      async () => ({ maxAmount: 50000, maxRiskScore: 80, agentType: 'underwriting' }),
    );
  }
}
