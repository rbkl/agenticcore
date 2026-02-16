import { z } from 'zod';

export const VehicleRiskDataSchema = z.object({
  vin: z.string(),
  year: z.number(),
  make: z.string(),
  model: z.string(),
  usage: z.enum(['pleasure', 'commute', 'business']),
  annualMileage: z.number().optional(),
});

export type VehicleRiskData = z.infer<typeof VehicleRiskDataSchema>;

export const PropertyRiskDataSchema = z.object({
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }),
  constructionType: z.enum(['frame', 'masonry', 'fire_resistive', 'superior']),
  yearBuilt: z.number(),
  squareFeet: z.number(),
  numberOfStories: z.number().optional(),
  roofType: z.string().optional(),
});

export type PropertyRiskData = z.infer<typeof PropertyRiskDataSchema>;

export const DriverRiskDataSchema = z.object({
  licenseNumber: z.string(),
  licenseState: z.string(),
  dateOfBirth: z.string(),
  gender: z.enum(['male', 'female', 'non_binary']).optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  accidents: z.array(z.object({
    date: z.string(),
    type: z.string(),
    atFault: z.boolean(),
  })).default([]),
  violations: z.array(z.object({
    date: z.string(),
    type: z.string(),
    points: z.number().optional(),
  })).default([]),
});

export type DriverRiskData = z.infer<typeof DriverRiskDataSchema>;

export const RiskSchema = z.object({
  id: z.string().uuid(),
  riskType: z.enum(['vehicle', 'property', 'driver']),
  policyId: z.string().uuid(),
  data: z.union([VehicleRiskDataSchema, PropertyRiskDataSchema, DriverRiskDataSchema]),
});

export type Risk = z.infer<typeof RiskSchema>;
