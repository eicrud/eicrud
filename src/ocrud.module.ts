import { DynamicModule, Module, Type } from '@nestjs/common';
import { CrudService } from './crud/crud.service';
import { CrudController } from './crud/crud.controller';
import { CrudConfigService } from './crud/crud.config.service';
import { CrudAuthorizationService } from './crud/crud.authorization.service';
import { AuthService } from './auth/auth.service';

@Module({})
export class OcrudModule {
  static register(configService: Type<CrudConfigService>): DynamicModule {

    return {
      module: OcrudModule,
      providers: [CrudAuthorizationService, AuthService, configService],
      controllers: [CrudController],
      exports: [],
    };
  }
}