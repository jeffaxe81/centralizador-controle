import { Global, Module } from '@nestjs/common';
import { PolicyCompilerService } from './policy-compiler.service';

@Global()
@Module({
  providers: [PolicyCompilerService],
  exports: [PolicyCompilerService],
})
export class PolicyCompilerModule {}
