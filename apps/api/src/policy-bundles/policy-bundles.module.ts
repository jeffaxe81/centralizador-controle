import { Module } from '@nestjs/common';
import { PolicyBundlesController } from './policy-bundles.controller';
import { PolicyBundlesService } from './policy-bundles.service';

@Module({
  controllers: [PolicyBundlesController],
  providers: [PolicyBundlesService],
})
export class PolicyBundlesModule {}
