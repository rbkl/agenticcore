import { pgTable, uuid, varchar, timestamp, jsonb, numeric, date } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const policies = pgTable('policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyNumber: varchar('policy_number', { length: 50 }).unique(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  productCode: varchar('product_code', { length: 50 }).notNull(),
  lobCode: varchar('lob_code', { length: 50 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  effectiveDate: date('effective_date'),
  expirationDate: date('expiration_date'),
  premiumAmount: numeric('premium_amount', { precision: 12, scale: 2 }),
  premiumCurrency: varchar('premium_currency', { length: 3 }).default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const policyTransactions = pgTable('policy_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').notNull().references(() => policies.id),
  type: varchar('type', { length: 30 }).notNull(),
  status: varchar('status', { length: 30 }).notNull(),
  effectiveDate: date('effective_date'),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const coverages = pgTable('coverages', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').notNull().references(() => policies.id),
  coverageCode: varchar('coverage_code', { length: 50 }).notNull(),
  limitAmount: numeric('limit_amount', { precision: 12, scale: 2 }),
  limitCurrency: varchar('limit_currency', { length: 3 }).default('USD'),
  deductibleAmount: numeric('deductible_amount', { precision: 12, scale: 2 }),
  deductibleCurrency: varchar('deductible_currency', { length: 3 }).default('USD'),
  premiumAmount: numeric('premium_amount', { precision: 12, scale: 2 }),
  premiumCurrency: varchar('premium_currency', { length: 3 }).default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const risks = pgTable('risks', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').notNull().references(() => policies.id),
  riskType: varchar('risk_type', { length: 30 }).notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').notNull().references(() => policies.id),
  address: jsonb('address').notNull(),
  territory: varchar('territory', { length: 20 }),
  protectionClass: varchar('protection_class', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const modifiers = pgTable('modifiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').notNull().references(() => policies.id),
  type: varchar('type', { length: 30 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  ratingFactor: numeric('rating_factor', { precision: 8, scale: 4 }),
  applied: varchar('applied', { length: 5 }).notNull().default('false'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
