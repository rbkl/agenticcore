import { eq, and, asc } from 'drizzle-orm';
import { DomainEvent, ConcurrencyError } from '@agenticcore/shared';
import { db, Database, DatabaseOperations } from '../database';
import { eventStore, eventStoreSnapshots } from '../schema/event-store';

export class EventStoreRepository {
  constructor(private readonly database: Database = db) {}

  async getEvents(aggregateId: string, afterVersion = 0): Promise<DomainEvent[]> {
    const rows = await this.database
      .select()
      .from(eventStore)
      .where(
        and(
          eq(eventStore.aggregateId, aggregateId),
        ),
      )
      .orderBy(asc(eventStore.version));

    return rows
      .filter((row) => row.version > afterVersion)
      .map((row) => ({
        eventId: row.id,
        aggregateId: row.aggregateId,
        aggregateType: row.aggregateType,
        eventType: row.eventType,
        version: row.version,
        payload: row.payload as Record<string, unknown>,
        metadata: row.metadata as DomainEvent['metadata'],
      }));
  }

  async appendEvents(events: DomainEvent[], expectedVersion: number, tx?: DatabaseOperations): Promise<void> {
    if (events.length === 0) return;

    const database = tx || this.database;
    const aggregateId = events[0]!.aggregateId;

    // Check for concurrency conflicts
    const latestEvents = await database
      .select({ version: eventStore.version })
      .from(eventStore)
      .where(eq(eventStore.aggregateId, aggregateId))
      .orderBy(asc(eventStore.version));

    const currentVersion = latestEvents.length > 0
      ? latestEvents[latestEvents.length - 1]!.version
      : 0;

    if (currentVersion !== expectedVersion) {
      throw new ConcurrencyError(aggregateId, expectedVersion, currentVersion);
    }

    const rows = events.map((event) => ({
      id: event.eventId,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      version: event.version,
      payload: event.payload,
      metadata: event.metadata as unknown as Record<string, unknown>,
    }));

    await database.insert(eventStore).values(rows);
  }

  async getSnapshot(aggregateId: string): Promise<{ version: number; state: Record<string, unknown> } | null> {
    const rows = await this.database
      .select()
      .from(eventStoreSnapshots)
      .where(eq(eventStoreSnapshots.aggregateId, aggregateId));

    if (rows.length === 0) return null;

    const row = rows[0]!;
    return {
      version: row.version,
      state: row.state as Record<string, unknown>,
    };
  }

  async saveSnapshot(aggregateId: string, aggregateType: string, version: number, state: Record<string, unknown>): Promise<void> {
    await this.database
      .insert(eventStoreSnapshots)
      .values({ aggregateId, aggregateType, version, state })
      .onConflictDoUpdate({
        target: eventStoreSnapshots.aggregateId,
        set: { version, state, createdAt: new Date() },
      });
  }
}
