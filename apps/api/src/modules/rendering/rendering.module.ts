import { Module } from '@nestjs/common';
import { RenderingService } from './rendering.service';
import { RenderingController } from './rendering.controller';
import { VariationService } from './variation.service';
import { TemplatesModule } from '../templates/templates.module';
import { GatewaysModule } from '../../gateways/gateways.module';

@Module({
  imports: [TemplatesModule, GatewaysModule],
  controllers: [RenderingController],
  providers: [RenderingService, VariationService],
  exports: [RenderingService, VariationService],
})
export class RenderingModule {}
