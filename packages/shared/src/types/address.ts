import { z } from 'zod';

export const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  county: z.string().optional(),
  country: z.string().default('US'),
});

export type Address = z.infer<typeof AddressSchema>;
