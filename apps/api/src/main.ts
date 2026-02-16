import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AgenticCore API')
    .setDescription('AI-Agent-First Insurance Core Platform')
    .setVersion('0.1.0')
    .addTag('health', 'Health check endpoints')
    .addTag('policies', 'Policy management')
    .addTag('rating', 'Rating and quoting')
    .addTag('products', 'Product configuration')
    .addTag('agents', 'AI agent interactions')
    .addTag('admin', 'Administration')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`AgenticCore API running on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
