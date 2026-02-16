import { EntityId } from '../types';
import { DomainEvent, DomainEventMetadata, createEventId } from './domain-event';

export abstract class AggregateRoot {
  readonly id: EntityId;
  private _version = 0;
  private _uncommittedEvents: DomainEvent[] = [];

  constructor(id: EntityId) {
    this.id = id;
  }

  get version(): number {
    return this._version;
  }

  get uncommittedEvents(): ReadonlyArray<DomainEvent> {
    return this._uncommittedEvents;
  }

  clearUncommittedEvents(): void {
    this._uncommittedEvents = [];
  }

  protected apply(
    eventType: string,
    payload: Record<string, unknown>,
    metadata: Omit<DomainEventMetadata, 'timestamp'>,
  ): void {
    const event: DomainEvent = {
      eventId: createEventId(),
      aggregateId: this.id,
      aggregateType: this.getAggregateType(),
      eventType,
      version: this._version + 1,
      payload,
      metadata: { ...metadata, timestamp: new Date() },
    };

    this.applyEvent(event);
    this._uncommittedEvents.push(event);
  }

  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
    }
  }

  private applyEvent(event: DomainEvent): void {
    this.onEvent(event);
    this._version = event.version;
  }

  protected abstract getAggregateType(): string;
  protected abstract onEvent(event: DomainEvent): void;
}
