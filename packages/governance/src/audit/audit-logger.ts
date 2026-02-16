export interface AuditEvent {
  id: string;
  timestamp: Date;
  actor: {
    type: 'agent' | 'human' | 'system';
    id: string;
    name: string;
  };
  action: string;
  target: {
    entityType: string;
    entityId: string;
  };
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  decision: 'approved' | 'blocked' | 'escalated';
  rulesEvaluated: Array<{ ruleId: string; result: string }>;
  reasoning?: string;
}

export class AuditLogger {
  private events: AuditEvent[] = [];

  log(event: AuditEvent): void {
    this.events.push(event);
  }

  getEvents(filter?: {
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    decision?: string;
    from?: Date;
    to?: Date;
  }): AuditEvent[] {
    let result = [...this.events];

    if (filter) {
      if (filter.actorId) result = result.filter(e => e.actor.id === filter.actorId);
      if (filter.action) result = result.filter(e => e.action === filter.action);
      if (filter.entityType) result = result.filter(e => e.target.entityType === filter.entityType);
      if (filter.entityId) result = result.filter(e => e.target.entityId === filter.entityId);
      if (filter.decision) result = result.filter(e => e.decision === filter.decision);
      if (filter.from) result = result.filter(e => e.timestamp >= filter.from!);
      if (filter.to) result = result.filter(e => e.timestamp <= filter.to!);
    }

    return result;
  }

  getEventById(id: string): AuditEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  getEventCount(): number {
    return this.events.length;
  }
}
