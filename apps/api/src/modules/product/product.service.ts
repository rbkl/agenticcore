import { Injectable, OnModuleInit } from '@nestjs/common';
import { ProductRegistry, ProductDefinition, validateProductDefinition } from '@agenticcore/domain-product';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProductService implements OnModuleInit {
  private registry = new ProductRegistry();

  onModuleInit() {
    this.loadProductConfigs();
  }

  getAll(): ProductDefinition[] {
    return this.registry.getAll();
  }

  getByCode(code: string): ProductDefinition | undefined {
    return this.registry.get(code);
  }

  updateProduct(code: string, config: ProductDefinition): { success: boolean; errors?: string[] } {
    const validation = validateProductDefinition(config);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    this.registry.register(config);
    return { success: true };
  }

  private loadProductConfigs(): void {
    const configDir = path.resolve(process.cwd(), 'config/products');
    if (!fs.existsSync(configDir)) {
      // Try monorepo root
      const monoRoot = path.resolve(__dirname, '../../../../config/products');
      if (fs.existsSync(monoRoot)) {
        this.loadFromDirectory(monoRoot);
      }
      return;
    }
    this.loadFromDirectory(configDir);
  }

  private loadFromDirectory(dir: string): void {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const parsed = JSON.parse(content);
      const validation = validateProductDefinition(parsed);
      if (validation.valid) {
        this.registry.register(parsed as ProductDefinition);
      }
    }
  }
}
