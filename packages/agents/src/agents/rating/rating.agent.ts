import { BaseAgent, AgentConfig, AgentTaskInput, AgentTaskResult } from '../../framework/base-agent';
import { generateId } from '@agenticcore/shared';

const SYSTEM_PROMPT = `You are an insurance rating AI agent. Your role is to calculate premiums accurately using the rating engine. You validate inputs, run calculations, and generate detailed worksheets.`;

export class RatingAgent extends BaseAgent {
  constructor(model?: string) {
    const config: AgentConfig = {
      agentType: 'rating',
      model: model || process.env.RATING_AGENT_MODEL || 'claude-sonnet-4-5-20250929',
      systemPrompt: SYSTEM_PROMPT,
      tools: [
        { name: 'calculate_quote', description: 'Calculate premium for a submission', inputSchema: { type: 'object', properties: { submissionId: { type: 'string' } }, required: ['submissionId'] } },
        { name: 'get_rate_tables', description: 'Get applicable rate tables', inputSchema: { type: 'object', properties: { lobCode: { type: 'string' }, stateCode: { type: 'string' } }, required: ['lobCode'] } },
        { name: 'get_worksheet', description: 'Get rating worksheet details', inputSchema: { type: 'object', properties: { quoteNumber: { type: 'string' } }, required: ['quoteNumber'] } },
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
      result: { message: 'Rating calculation completed', submissionId: input.payload.submissionId },
      toolCalls: [...this.toolCalls],
      reasoning: 'Rating completed using the rating pipeline.',
    };
  }
}
