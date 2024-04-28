import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CrudUserService } from '../user/crud-user.service';
import { JwtService } from '@nestjs/jwt';
import { _utils } from '../utils';

import * as bcrypt from 'bcrypt';
import { t } from '@mikro-orm/core';
import { CrudConfigService } from '../crud/crud.config.service';
import { CrudErrors } from '../crud/model/CrudErrors';
import { CrudUser } from '../user/model/CrudUser';

export interface AuthenticationOptions {
  VERIFICATION_EMAIL_TIMEOUT_HOURS: number;
  TWOFA_EMAIL_TIMEOUT_MIN: number;
  PASSWORD_RESET_EMAIL_TIMEOUT_HOURS: number;
  PASSWORD_MAX_LENGTH: number;
}

@Injectable()
export class CrudAuthService {

  constructor(
    protected jwtService: JwtService,
    protected JWT_SECRET: string,
    protected FIELDS_IN_PAYLOAD: string[] = ['_id', 'revokedCount'],
    protected USERNAME_FIELD = 'email',
    protected crudConfig: CrudConfigService,

  ) {}

  rateLimitCount = 6;

  async updateUserLoginDetails(user){
    const patch: Partial<CrudUser> = {failedLoginCount: user.failedLoginCount, lastLoginAttempt: user.lastLoginAttempt};
    await this.crudConfig.userService.unsecure_fastPatchOne(user[this.crudConfig.id_field], patch as any, null);
  }

  async signIn(email, pass, twoFA_code?) {
    const entity = {};
    entity[this.USERNAME_FIELD] = email;
    const user = await this.crudConfig.userService.findOne(entity, null);
    if(!user){
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }

    if(user?.timeout && user.timeout > new Date()){
      throw new UnauthorizedException(CrudErrors.TIMED_OUT.str(user.timeout.toISOString()));
    }

    if(user.failedLoginCount >= this.rateLimitCount){
      const timeoutMS = Math.min(user.failedLoginCount*user.failedLoginCount*1000, 60000 * 5);
      const diffMs = _utils.diffBetweenDatesMs(user.lastLoginAttempt, new Date());
      if(diffMs < timeoutMS){ 
        throw new UnauthorizedException(CrudErrors.TOO_MANY_LOGIN_ATTEMPTS.str(Math.round((timeoutMS-diffMs)/1000) + " seconds"));
      }
    }

    if(user.twoFA && this.crudConfig.emailService){
      if(!twoFA_code){
        await this.crudConfig.userService.sendTwoFACode(user[this.crudConfig.id_field], user as CrudUser, null);
        throw new UnauthorizedException(CrudErrors.TWOFA_REQUIRED.str());
      }
      await this.crudConfig.userService.verifyTwoFA(user, twoFA_code);
    }

    user.lastLoginAttempt = new Date();
    if (await bcrypt.compare(pass, user?.password)) {
      user.failedLoginCount++;
      await this.updateUserLoginDetails(user)
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }

    user.failedLoginCount = 0;
    await this.updateUserLoginDetails(user)
    const payload = {};
    this.FIELDS_IN_PAYLOAD.forEach(field => {
        payload[field] = user[field];
    });
    return {
      access_token: await this.signTokenForUser(user)
    }
  }

  signTokenForUser(user){
    const payload = {};
    this.FIELDS_IN_PAYLOAD.forEach(field => {
        payload[field] = user[field];
    });
    return this.jwtService.sign(payload,
        {
        secret: this.JWT_SECRET,
      });
  }


  async getJwtPayload(token: string) {
    return await this.jwtService.verifyAsync(
      token,
      {
        secret: this.JWT_SECRET,
      }
    );
  }
}