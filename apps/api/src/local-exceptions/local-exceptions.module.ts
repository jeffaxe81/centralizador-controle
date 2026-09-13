import { Module } from '@nestjs/common';
import { LocalExceptionsController } from './local-exceptions.controller';
import { LocalExceptionsService } from './local-exceptions.service';

@Module({
  controllers: [LocalExceptionsController],
  providers: [LocalExceptionsService],
})
export class LocalExceptionsModule {}
