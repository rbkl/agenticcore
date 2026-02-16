import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  lobCode: varchar('lob_code', { length: 50 }).notNull(),
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  config: jsonb('config').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const coverageDefinitions = pgTable('coverage_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  coverageCode: varchar('coverage_code', { length: 50 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  required: varchar('required', { length: 5 }).notNull().default('false'),
  defaultLimit: jsonb('default_limit'),
  defaultDeductible: jsonb('default_deductible'),
  availableLimits: jsonb('available_limits'),
  availableDeductibles: jsonb('available_deductibles'),
  rules: jsonb('rules'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
