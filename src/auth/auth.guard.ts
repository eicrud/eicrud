import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthUtils } from './auth.utils';
import { CrudService } from '../crud/crud.service';
import { CrudDto, CrudEntity } from '../crud/model/CrudEntity';
import { CrudContext } from './model/CrudContext';
import { CrudSecurity } from '../crud/model/CrudSecurity';
import { CrudUser } from '../user/entity/CrudUser';
import { CrudConfigService } from '../crud/model/CrudConfigService';


@Injectable()
export class AuthGuard implements CanActivate {
  
  
  constructor(protected jwtService: JwtService, protected reflector: Reflector,
    protected usersService: CrudService<CrudUser>,
    protected JWT_SECRET: string,
    protected servicePositionInUri = 2,
    protected crudConfig: CrudConfigService
    ) {
      
    }


  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    let user: CrudUser = { role: this.crudConfig.guest_role } as any;
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(
          token,
          {
            secret: this.JWT_SECRET,
          }
        );
        // 💡 We're assigning the payload to the request object here
        // so that we can access it in our route handlers
        if(request.method == 'POST'){
          user = await this.usersService.findOne(payload, null);
        }else{
          user = await this.usersService.findOneCached(payload, null);
        }

        if(user?.revokedCount != payload.revokedCount){
          throw new UnauthorizedException("Token revokedCount mismatch");
        }

      } catch(e) {
        throw new UnauthorizedException(e);
      }
    }

    user.crudMap = user.crudMap || {};
    const crudContext: CrudContext = { user };
    request['crudContext'] = crudContext
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

}