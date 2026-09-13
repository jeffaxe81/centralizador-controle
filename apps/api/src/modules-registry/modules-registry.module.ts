import { Module } from '@nestjs/common';
import { ModulesRegistryController } from './modules-registry.controller';
import { ModulesRegistryService } from './modules-registry.service';

@Module({
  controllers: [ModulesRegistryController],
  providers: [ModulesRegistryService],
})
export class ModulesRegistryModule {}
