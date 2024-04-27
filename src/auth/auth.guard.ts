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
import LRUCache from 'mnemonist/lru-cache';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrudConfigService } from '../crud/crud.config.service';
import { LogType } from '../log/entities/log';
import { CrudErrors } from '../crud/model/CrudErrors';


export interface TrafficWatchOptions{
  MAX_USERS: number;

  REQUEST_THRESHOLD: number;

  TIMEOUT_THRESHOLD_TOTAL: number;

  TIMEOUT_DURATION_MIN: number;

}

@Injectable()
export class AuthGuard implements CanActivate {
  
  userTrafficMap: LRUCache<string, number>;
  reciprocalRequestThreshold: number;

  
  @Cron(CronExpression.EVERY_5_MINUTES)
  handleCron() {
    this.userTrafficMap.clear();
  }

  
  constructor(protected jwtService: JwtService, protected reflector: Reflector,
    protected usersService: CrudService<CrudUser>,
    protected JWT_SECRET: string,
    protected servicePositionInUri = 2,
    protected crudConfig: CrudConfigService
    ) {
      this.userTrafficMap = new LRUCache(crudConfig.watchTrafficOptions.MAX_USERS);
      this.reciprocalRequestThreshold = 1 / this.crudConfig.watchTrafficOptions.REQUEST_THRESHOLD;

    }



    async addTrafficToUserTrafficMap(userId, user: Partial<CrudUser>){
      let traffic = this.userTrafficMap.get(userId);
      if (traffic === undefined) {
        traffic = 0;
      }
      if(traffic > this.crudConfig.watchTrafficOptions.REQUEST_THRESHOLD){
        user.highTrafficCount = user.highTrafficCount || 0;
        user.highTrafficCount += Math.round(traffic * this.reciprocalRequestThreshold);
        if(user.highTrafficCount > this.crudConfig.watchTrafficOptions.TIMEOUT_THRESHOLD_TOTAL){
          this.crudConfig.userService.addTimeoutToUser(user, this.crudConfig.watchTrafficOptions.TIMEOUT_DURATION_MIN)
        }
        user.captchaRequested = true;
        this.usersService.unsecure_fastPatchOne(userId, { highTrafficCount: user.highTrafficCount }, null);
        this.usersService.setCached(user, null);
        this.crudConfig.logService?.log(LogType.SECURITY, 
          `High traffic event for user ${userId} with ${traffic} requests.`, 
          { userId, user } as CrudContext
          )
        await this.crudConfig.onHighTrafficEvent(traffic, user);
      }
      this.userTrafficMap.set(userId, traffic + 1);
    }


  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    let user: Partial<CrudUser> = { role: this.crudConfig.guest_role };
    let userId;
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(
          token,
          {
            secret: this.JWT_SECRET,
          }
        );

        if(request.method == 'POST' ){
          user = await this.usersService.findOne(payload, null);
        }else{
          user = await this.usersService.findOneCached(payload, null);
        }

        if(user?.revokedCount != payload.revokedCount){
          throw new UnauthorizedException(CrudErrors.TOKEN_MISMATCH.str());
        }

        if(user?.captchaRequested && !user?.didCaptcha 
          && !request.path.includes('crud/captcha')
          && this.crudConfig.captchaService
          ){
          throw new UnauthorizedException(CrudErrors.CAPTCHA_REQUIRED.str());
        }

        userId = user?.[this.crudConfig.id_field];

        await this.addTrafficToUserTrafficMap(userId, user);

      } catch(e) {
        throw new UnauthorizedException(e);
      }
    }

    user.crudUserDataMap = user.crudUserDataMap || {};
    const crudContext: CrudContext = { user, userId };
    request['crudContext'] = crudContext
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

}