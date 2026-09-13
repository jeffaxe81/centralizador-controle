import { Body, Controller, Get, Param, Patch, Post, Headers } from '@nestjs/common';
import { ProfilesService, CreateProfileDto, UpdateProfileDto } from './profiles.service';
import { TenantId } from '../common/tenant.decorator';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.profilesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.profilesService.findOne(tenantId, id);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateProfileDto,
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.profilesService.create(tenantId, dto, actorId);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.profilesService.update(tenantId, id, dto, actorId);
  }
}
