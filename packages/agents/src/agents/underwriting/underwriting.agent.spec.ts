import { describe, it, expect } from 'vitest';
import { UnderwritingAgent } from './underwriting.agent';
import { AgentTaskInput } from '../../framework/base-agent';
import { generateId } from '@agenticcore/shared';

describe('UnderwritingAgent', () => {
  const agent = new UnderwritingAgent();

  it('should approve a standard submission', async () => {
    const input: AgentTaskInput = {
      taskId: generateId(),
      taskType: 'underwrite_submission',
      payload: { submissionId: 'sub-1' },
    };

    const result = await agent.execute(input);

    expect(result.status).toBe('completed');
    expect(result.agentType).toBe('underwriting');
    expect(result.toolCalls.length).toBeGreaterThan(0);
    expect(result.reasoning).toBeDefined();
  });

  it('should include tool call history', async () => {
    const input: AgentTaskInput = {
      taskId: generateId(),
      taskType: 'underwrite_submission',
      payload: { submissionId: 'sub-2' },
    };

    const result = await agent.execute(input);

    expect(result.toolCalls.length).toBeGreaterThanOrEqual(3);
    const toolNames = result.toolCalls.map(tc => tc.toolName);
    expect(toolNames).toContain('get_submission');
    expect(toolNames).toContain('get_risk_score');
    expect(toolNames).toContain('get_authority_limits');
  });

  it('should produce a session id', async () => {
    const input: AgentTaskInput = {
      taskId: generateId(),
      taskType: 'underwrite_submission',
      payload: { submissionId: 'sub-3' },
    };

    const result = await agent.execute(input);

    expect(result.sessionId).toBeDefined();
    expect(result.sessionId.length).toBeGreaterThan(0);
  });
});
