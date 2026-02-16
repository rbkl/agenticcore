import { z } from 'zod';

export const PolicyNumberSchema = z.string().regex(/^POL-[A-Z0-9]+-[A-Z0-9]+$/);
export type PolicyNumber = z.infer<typeof PolicyNumberSchema>;
