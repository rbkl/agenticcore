import { z } from 'zod';
import { MoneySchema } from '@agenticcore/shared';

export const CoverageSchema = z.object({
  id: z.string().uuid(),
  coverageCode: z.string(),
  policyId: z.string().uuid(),
  limit: MoneySchema,
  deductible: MoneySchema,
  premium: MoneySchema,
});

export type Coverage = z.infer<typeof CoverageSchema>;
