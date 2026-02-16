import { z } from 'zod';

export const CoverageDefinitionSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  defaultLimit: z.object({ amount: z.number(), currency: z.string().default('USD') }).optional(),
  defaultDeductible: z.object({ amount: z.number(), currency: z.string().default('USD') }).optional(),
  availableLimits: z.array(z.number()).optional(),
  availableDeductibles: z.array(z.number()).optional(),
  rules: z.array(z.object({
    type: z.string(),
    condition: z.string(),
    message: z.string(),
  })).optional(),
});

export type CoverageDefinition = z.infer<typeof CoverageDefinitionSchema>;

export const RiskDefinitionSchema = z.object({
  type: z.string(),
  name: z.string(),
  required: z.boolean().default(false),
  fields: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'date', 'enum']),
    required: z.boolean().default(false),
    enumValues: z.array(z.string()).optional(),
  })),
});

export type RiskDefinition = z.infer<typeof RiskDefinitionSchema>;

export const ProductDefinitionSchema = z.object({
  code: z.string(),
  name: z.string(),
  lobCode: z.string(),
  version: z.string().default('1.0'),
  description: z.string().optional(),
  effectiveDate: z.string(),
  states: z.array(z.string()),
  coverages: z.array(CoverageDefinitionSchema),
  risks: z.array(RiskDefinitionSchema),
  rules: z.array(z.object({
    name: z.string(),
    type: z.string(),
    condition: z.string(),
    severity: z.enum(['info', 'warning', 'block']),
    message: z.string(),
  })).optional(),
});

export type ProductDefinition = z.infer<typeof ProductDefinitionSchema>;
