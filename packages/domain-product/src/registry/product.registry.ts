import { ProductDefinition } from '../models/product.model';

export class ProductRegistry {
  private products = new Map<string, ProductDefinition>();

  register(product: ProductDefinition): void {
    this.products.set(product.code, product);
  }

  get(code: string): ProductDefinition | undefined {
    return this.products.get(code);
  }

  getAll(): ProductDefinition[] {
    return Array.from(this.products.values());
  }

  getByLob(lobCode: string): ProductDefinition[] {
    return this.getAll().filter(p => p.lobCode === lobCode);
  }

  has(code: string): boolean {
    return this.products.has(code);
  }
}
