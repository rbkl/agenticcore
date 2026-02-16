import { ProductDefinition, ProductDefinitionSchema } from '../models/product.model';

export interface ProductValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProductDefinition(definition: unknown): ProductValidationResult {
  const result = ProductDefinitionSchema.safeParse(definition);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}
