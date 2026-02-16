import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthController } from './health.controller';
import { PolicyModule } from './modules/policy/policy.module';
import { RatingModule } from './modules/rating/rating.module';
import { ProductModule } from './modules/product/product.module';
import { AgentModule } from './modules/agent/agent.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    PolicyModule,
    RatingModule,
    ProductModule,
    AgentModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
