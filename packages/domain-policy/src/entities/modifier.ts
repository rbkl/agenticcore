import { z } from 'zod';

export const ModifierSchema = z.object({
  id: z.string().uuid(),
  policyId: z.string().uuid(),
  type: z.enum(['scheduled', 'unscheduled', 'boolean', 'date']),
  code: z.string(),
  ratingFactor: z.number(),
  applied: z.boolean().default(false),
});

export type Modifier = z.infer<typeof ModifierSchema>;
