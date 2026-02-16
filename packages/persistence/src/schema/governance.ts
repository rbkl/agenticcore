import { pgTable, uuid, varchar, timestamp, jsonb, numeric, integer } from 'drizzle-orm/pg-core';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  actorId: varchar('actor_id', { length: 100 }).notNull(),
  actorName: varchar('actor_name', { length: 200 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  targetEntityType: varchar('target_entity_type', { length: 100 }),
  targetEntityId: varchar('target_entity_id', { length: 100 }),
  input: jsonb('input'),
  output: jsonb('output'),
  decision: varchar('decision', { length: 20 }).notNull(),
  rulesEvaluated: jsonb('rules_evaluated'),
  reasoning: varchar('reasoning', { length: 5000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentType: varchar('agent_type', { length: 50 }).notNull(),
  taskId: varchar('task_id', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  input: jsonb('input'),
  output: jsonb('output'),
  toolCalls: jsonb('tool_calls').$type<Array<Record<string, unknown>>>().default([]),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const authorityLimits = pgTable('authority_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentType: varchar('agent_type', { length: 50 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  maxAmount: numeric('max_amount', { precision: 12, scale: 2 }),
  maxRiskScore: integer('max_risk_score'),
  requiresHumanApproval: varchar('requires_human_approval', { length: 5 }).notNull().default('false'),
  escalateTo: varchar('escalate_to', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const businessRules = pgTable('business_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  condition: jsonb('condition').notNull(),
  action: jsonb('action').notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  lobCode: varchar('lob_code', { length: 50 }),
  stateCode: varchar('state_code', { length: 2 }),
  active: varchar('active', { length: 5 }).notNull().default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
