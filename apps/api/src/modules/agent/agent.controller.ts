import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentService } from './agent.service';

@ApiTags('agents')
@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('tasks')
  @ApiOperation({ summary: 'Submit a task to the agent system' })
  @ApiResponse({ status: 201, description: 'Task submitted and processed' })
  async submitTask(
    @Body() body: { agentType: string; taskType: string; payload: Record<string, unknown> },
  ) {
    return this.agentService.submitTask(body.agentType, body.taskType, body.payload);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task status and result' })
  async getTask(@Param('id') id: string) {
    const result = this.agentService.getTaskResult(id);
    if (!result) return { error: 'Task not found', id };
    return result;
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Interactive agent chat' })
  async chat(@Body() body: { agentType: string; message: string; sessionId?: string }) {
    return this.agentService.submitTask(body.agentType, 'chat', {
      message: body.message,
      sessionId: body.sessionId,
    });
  }

  @Get('escalations')
  @ApiOperation({ summary: 'List pending escalations' })
  async getEscalations() {
    return this.agentService.getEscalations();
  }

  @Post('escalations/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a human escalation' })
  async resolveEscalation(
    @Param('id') id: string,
    @Body() body: { decision: string; notes: string },
  ) {
    return this.agentService.resolveEscalation(id, body.decision, body.notes);
  }

  @Get('types')
  @ApiOperation({ summary: 'List registered agent types' })
  async getAgentTypes() {
    return this.agentService.getRegisteredAgents();
  }
}
