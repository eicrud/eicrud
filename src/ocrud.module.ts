import { DynamicModule, Module, Type, forwardRef } from '@nestjs/common';
import { CrudController } from './crud/crud.controller';
import { CrudConfigService } from './crud/crud.config.service';
import { CrudAuthorizationService } from './crud/crud.authorization.service';
import { CrudAuthService } from './authentification/auth.service';
import { CrudAuthGuard } from './authentification/auth.guard';
import { NestApplication } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Module({})
export class OCRUDModule {
  static forRoot(): DynamicModule {
    
    return {
      module: OCRUDModule,
      imports: [],
      providers: [
        JwtService,
        CrudAuthorizationService, CrudAuthService, 
        {
          provide: APP_GUARD,
          useClass: CrudAuthGuard,
        },
      ],
      controllers: [CrudController],
      exports: [],
      
    };
  }
}