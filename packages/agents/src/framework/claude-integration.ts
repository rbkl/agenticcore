import { AgentConfig, AgentToolDefinition, AgentToolCall } from './base-agent';
import { ToolRegistry } from './tool-registry';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export interface ClaudeContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

export interface ClaudeToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export function buildClaudeTools(tools: AgentToolDefinition[]): Array<{
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}> {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

export async function processToolCalls(
  toolUseBlocks: ClaudeToolUseBlock[],
  toolRegistry: ToolRegistry,
  onToolCall?: (call: AgentToolCall) => void,
): Promise<ClaudeContentBlock[]> {
  const results: ClaudeContentBlock[] = [];

  for (const block of toolUseBlocks) {
    const start = Date.now();
    try {
      const output = await toolRegistry.execute(block.name, block.input);
      const call: AgentToolCall = {
        toolName: block.name,
        input: block.input,
        output,
        timestamp: new Date(),
        duration: Date.now() - start,
      };
      onToolCall?.(call);

      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(output),
      });
    } catch (error) {
      const call: AgentToolCall = {
        toolName: block.name,
        input: block.input,
        output: { error: String(error) },
        timestamp: new Date(),
        duration: Date.now() - start,
        blocked: true,
        blockReason: String(error),
      };
      onToolCall?.(call);

      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify({ error: String(error) }),
      });
    }
  }

  return results;
}
