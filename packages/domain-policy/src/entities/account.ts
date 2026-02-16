import { z } from 'zod';
import { AddressSchema } from '@agenticcore/shared';

export const ContactSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['person', 'organization']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  addresses: z.array(AddressSchema).default([]),
});

export type Contact = z.infer<typeof ContactSchema>;

export const AccountContactSchema = z.object({
  contactId: z.string().uuid(),
  role: z.string(), // named_insured, additional_insured, agent
});

export const AccountSchema = z.object({
  id: z.string().uuid(),
  accountNumber: z.string(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  contacts: z.array(AccountContactSchema).default([]),
});

export type Account = z.infer<typeof AccountSchema>;
