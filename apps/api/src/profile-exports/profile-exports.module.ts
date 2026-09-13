import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProfileExportsController } from './profile-exports.controller';
import { ProfileExportsService } from './profile-exports.service';

@Module({
  imports: [HttpModule],
  controllers: [ProfileExportsController],
  providers: [ProfileExportsService],
})
export class ProfileExportsModule {}
