import { EntityId, ActorType } from '../types';

export interface DomainEventMetadata {
  correlationId: string;
  causationId?: string;
  actor: {
    type: ActorType;
    id: string;
    name: string;
  };
  timestamp: Date;
}

export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  aggregateId: EntityId;
  aggregateType: string;
  eventType: string;
  version: number;
  payload: TPayload;
  metadata: DomainEventMetadata;
}

export function createEventId(): string {
  return crypto.randomUUID();
}
