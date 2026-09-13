import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VaultModule } from './vault/vault.module';
import { RolesModule } from './roles/roles.module';
import { ModulesRegistryModule } from './modules-registry/modules-registry.module';
import { ProfilesModule } from './profiles/profiles.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ProfileExportsModule } from './profile-exports/profile-exports.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { PolicyBundlesModule } from './policy-bundles/policy-bundles.module';

@Module({
  imports: [
    PrismaModule,
    VaultModule,
    RolesModule,
    ModulesRegistryModule,
    ProfilesModule,
    IntegrationsModule,
    ProfileExportsModule,
    IngestionModule,
    PolicyBundlesModule,
  ],
})
export class AppModule {}
