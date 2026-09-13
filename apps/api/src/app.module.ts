import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VaultModule } from './vault/vault.module';
import { PolicyCompilerModule } from './policy-compiler/policy-compiler.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ModulesRegistryModule } from './modules-registry/modules-registry.module';
import { ProfilesModule } from './profiles/profiles.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ProfileExportsModule } from './profile-exports/profile-exports.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { PolicyBundlesModule } from './policy-bundles/policy-bundles.module';
import { LocalExceptionsModule } from './local-exceptions/local-exceptions.module';

@Module({
  imports: [
    PrismaModule,
    VaultModule,
    PolicyCompilerModule,
    RolesModule,
    PermissionsModule,
    ModulesRegistryModule,
    ProfilesModule,
    IntegrationsModule,
    ProfileExportsModule,
    IngestionModule,
    PolicyBundlesModule,
    LocalExceptionsModule,
  ],
})
export class AppModule {}
