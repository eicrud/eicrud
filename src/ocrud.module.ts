import { DynamicModule, Module, Type } from '@nestjs/common';
import { CrudController } from './crud/crud.controller';
import { CrudConfigService } from './crud/crud.config.service';
import { CrudAuthorizationService } from './crud/crud.authorization.service';
import { CrudAuthService } from './authentification/auth.service';
import { AuthGuard } from './authentification/auth.guard';
import { NestApplication } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';

@Module({})
export class OCRUDModule {
  static forRoot(ConfigService: Type<CrudConfigService>): DynamicModule {
    
    return {
      module: OCRUDModule,
      providers: [CrudAuthorizationService, CrudAuthService, 
        {
          provide: 'CRUD_CONFIG',
          useClass: ConfigService,
        },
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
      ],
      controllers: [CrudController],
      exports: [],
      
    };
  }
}