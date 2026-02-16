import { pgTable, uuid, varchar, timestamp, jsonb, date, numeric } from 'drizzle-orm/pg-core';

export const rateTables = pgTable('rate_tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  lobCode: varchar('lob_code', { length: 50 }).notNull(),
  stateCode: varchar('state_code', { length: 2 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  expirationDate: date('expiration_date').notNull(),
  dimensions: jsonb('dimensions').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rateTableEntries = pgTable('rate_table_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  rateTableId: uuid('rate_table_id').notNull().references(() => rateTables.id),
  keys: jsonb('keys').notNull(),
  value: numeric('value', { precision: 12, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
