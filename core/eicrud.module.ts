import { DynamicModule, Module, Type, forwardRef } from '@nestjs/common';
import { CrudController } from './crud/crud.controller';
import { CrudAuthorizationService } from './crud/crud.authorization.service';
import { CrudAuthService } from './authentification/auth.service';
import { CrudAuthGuard } from './authentification/auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Module({})
export class EICRUDModule {
  static forRoot(): DynamicModule {
    
    return {
      module: EICRUDModule,
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