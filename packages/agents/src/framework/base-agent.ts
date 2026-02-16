export interface AgentToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AgentToolCall {
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  timestamp: Date;
  duration?: number;
  blocked?: boolean;
  blockReason?: string;
}

export interface AgentConfig {
  agentType: string;
  model: string;
  systemPrompt: string;
  tools: AgentToolDefinition[];
  maxIterations: number;
  temperature?: number;
}

export interface AgentTaskInput {
  taskId: string;
  taskType: string;
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface AgentTaskResult {
  taskId: string;
  agentType: string;
  sessionId: string;
  status: 'completed' | 'escalated' | 'failed';
  result: Record<string, unknown>;
  toolCalls: AgentToolCall[];
  reasoning?: string;
  escalation?: {
    reason: string;
    escalateTo: string;
    context: Record<string, unknown>;
  };
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected toolCalls: AgentToolCall[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get agentType(): string {
    return this.config.agentType;
  }

  get model(): string {
    return this.config.model;
  }

  abstract execute(input: AgentTaskInput): Promise<AgentTaskResult>;

  protected recordToolCall(call: AgentToolCall): void {
    this.toolCalls.push(call);
  }

  protected resetToolCalls(): void {
    this.toolCalls = [];
  }
}
