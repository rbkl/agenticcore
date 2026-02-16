import { pgTable, uuid, varchar, integer, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';

export const eventStore = pgTable('event_store', {
  id: uuid('id').primaryKey().defaultRandom(),
  aggregateId: uuid('aggregate_id').notNull(),
  aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  version: integer('version').notNull(),
  payload: jsonb('payload').notNull(),
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('event_store_aggregate_version').on(table.aggregateId, table.version),
]);

export const eventStoreSnapshots = pgTable('event_store_snapshots', {
  aggregateId: uuid('aggregate_id').primaryKey(),
  aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
  version: integer('version').notNull(),
  state: jsonb('state').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
