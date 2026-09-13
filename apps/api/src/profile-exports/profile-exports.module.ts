import { Module } from '@nestjs/common';
import { ProfileExportsController } from './profile-exports.controller';
import { ProfileExportsService } from './profile-exports.service';

@Module({
  controllers: [ProfileExportsController],
  providers: [ProfileExportsService],
})
export class ProfileExportsModule {}
