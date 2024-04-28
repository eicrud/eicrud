import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthUtils } from './auth.utils';
import { CrudService } from '../crud/crud.service';
import { CrudDto, CrudEntity } from '../crud/model/CrudEntity';
import { CrudContext } from '../crud/model/CrudContext';
import { CrudSecurity } from '../crud/model/CrudSecurity';
import { CrudUser } from '../user/model/CrudUser';
import LRUCache from 'mnemonist/lru-cache';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrudConfigService } from '../crud/crud.config.service';
import { LogType } from '../log/entities/log';
import { CrudErrors } from '../crud/model/CrudErrors';
import { CrudOptions } from '../crud/model/CrudOptions';
import { CrudRole } from '../crud/model/CrudRole';
import { CrudAuthService } from './auth.service';


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

  
  constructor(
    protected usersService: CrudService<CrudUser>,
    protected crudConfig: CrudConfigService,
    protected authService: CrudAuthService
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
          this.crudConfig.userService.addTimeoutToUser(user as CrudUser, this.crudConfig.watchTrafficOptions.TIMEOUT_DURATION_MIN)
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
    const options: CrudOptions = request.query?.query?.options || {};
    if (token) {
      try {
        const payload = await this.authService.getJwtPayload(token);

        if(request.method == 'POST' ){
          user = await this.usersService.findOne(payload, null);
        }else{
          user = await this.usersService.findOneCached(payload, null);
        }

        if(!user){
          throw new UnauthorizedException(CrudErrors.USER_NOT_FOUND.str());
        }

        const role: CrudRole = this.crudConfig?.rolesMap[user?.role];

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

        if(options.mockRole && typeof options.mockRole == 'string' && role){
          const parents = this.crudConfig.getParentRolesRecurs(role).map(role => role.name);
          parents.push(role.name);
          if(!parents.includes(options.mockRole)){
            throw new UnauthorizedException(`Role ${role.name} is not allowed to mock as ${options.mockRole}`);
          }
          user.role = options.mockRole;
        }

        await this.addTrafficToUserTrafficMap(userId, user);

      } catch(e) {
        throw new UnauthorizedException(e);
      }
    }

    user.crudUserDataMap = user.crudUserDataMap || {};
    const crudContext: CrudContext = { user: user as any, userId };
    request['crudContext'] = crudContext
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

}