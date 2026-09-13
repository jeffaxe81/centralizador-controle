import { Body, Controller, Get, Post } from '@nestjs/common';
import { ModulesRegistryService, CreateModuleDto, RegisterModuleScopeDto } from './modules-registry.service';

@Controller('modules')
export class ModulesRegistryController {
  constructor(private readonly service: ModulesRegistryService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateModuleDto) {
    return this.service.create(dto);
  }

  @Post('scopes')
  registerScope(@Body() dto: RegisterModuleScopeDto) {
    return this.service.registerScope(dto);
  }
}
