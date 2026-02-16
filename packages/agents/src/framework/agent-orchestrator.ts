import { BaseAgent, AgentTaskInput, AgentTaskResult } from './base-agent';

export interface OrchestratorConfig {
  maxConcurrentTasks: number;
}

export class AgentOrchestrator {
  private agents = new Map<string, BaseAgent>();
  private activeTasks = new Map<string, Promise<AgentTaskResult>>();

  constructor(private config: OrchestratorConfig = { maxConcurrentTasks: 10 }) {}

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.agentType, agent);
  }

  getAgent(agentType: string): BaseAgent | undefined {
    return this.agents.get(agentType);
  }

  async submitTask(agentType: string, input: AgentTaskInput): Promise<AgentTaskResult> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`No agent registered for type: ${agentType}`);
    }

    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      throw new Error('Maximum concurrent tasks reached');
    }

    const taskPromise = agent.execute(input);
    this.activeTasks.set(input.taskId, taskPromise);

    try {
      const result = await taskPromise;
      return result;
    } finally {
      this.activeTasks.delete(input.taskId);
    }
  }

  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  getRegisteredAgentTypes(): string[] {
    return Array.from(this.agents.keys());
  }
}
