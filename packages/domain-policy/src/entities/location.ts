import { z } from 'zod';
import { AddressSchema } from '@agenticcore/shared';

export const LocationSchema = z.object({
  id: z.string().uuid(),
  policyId: z.string().uuid(),
  address: AddressSchema,
  territory: z.string().optional(),
  protectionClass: z.string().optional(),
  fireDepartmentDistance: z.number().optional(),
});

export type Location = z.infer<typeof LocationSchema>;
