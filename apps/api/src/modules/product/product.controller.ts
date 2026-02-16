import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductService } from './product.service';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List all products' })
  getAll() {
    return this.productService.getAll();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get product by code' })
  getByCode(@Param('code') code: string) {
    const product = this.productService.getByCode(code);
    if (!product) {
      return { error: 'Product not found', code };
    }
    return product;
  }

  @Put(':code')
  @ApiOperation({ summary: 'Update product configuration' })
  update(@Param('code') code: string, @Body() body: Record<string, unknown>) {
    return this.productService.updateProduct(code, body as any);
  }
}
