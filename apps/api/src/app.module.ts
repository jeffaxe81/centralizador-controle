import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { ModulesRegistryModule } from './modules-registry/modules-registry.module';
import { ProfilesModule } from './profiles/profiles.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ProfileExportsModule } from './profile-exports/profile-exports.module';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
  imports: [
    PrismaModule,
    RolesModule,
    ModulesRegistryModule,
    ProfilesModule,
    IntegrationsModule,
    ProfileExportsModule,
    IngestionModule,
  ],
})
export class AppModule {}
