import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CrudUserService } from '../user/crud-user.service';
import { JwtService } from '@nestjs/jwt';
import { _utils } from '../utils';

import * as bcrypt from 'bcrypt';
import { t } from '@mikro-orm/core';
import { CrudConfigService } from '../crud/crud.config.service';

@Injectable()
export class AuthService {
  constructor(
    protected jwtService: JwtService,
    protected JWT_SECRET: string,
    protected FIELDS_IN_PAYLOAD: string[] = ['_id', 'revokedCount'],
    protected USERNAME_FIELD = 'email',
    protected crudConfig: CrudConfigService,

  ) {}

  rateLimitCount = 6;

  async updateUserLoginDetails(user){
    await this.crudConfig.userService.unsecure_fastPatchOne(user[this.crudConfig.id_field], {failedLoginCount: user.failedLoginCount, lastLoginAttempt: user.lastLoginAttempt}, null);
  }

  async signIn(email, pass) {
    const entity = {};
    entity[this.USERNAME_FIELD] = email;
    const user = await this.crudConfig.userService.findOne(entity, null);
    if(!user){
      throw new UnauthorizedException("Unknown user.");
    }

    if(user.timeout > new Date()){
        throw new UnauthorizedException("Account locked. Please wait until " + user.timeout.toISOString());
    }

    if(user.failedLoginCount >= this.rateLimitCount){
      const timeoutMS = Math.min(user.failedLoginCount*user.failedLoginCount*1000, 60000 * 5);
      const diffMs = _utils.diffBetweenDatesMs(user.lastLoginAttempt, new Date());
      if(diffMs < timeoutMS){
        throw new UnauthorizedException("Too many login attempts. Please wait " + Math.round((timeoutMS-diffMs)/1000) + " seconds");
      }
    }
    user.lastLoginAttempt = new Date();
    if (await bcrypt.compare(pass, user?.password)) {
      user.failedLoginCount++;
      await this.updateUserLoginDetails(user)
      throw new UnauthorizedException("Invalid credentials");
    }

    user.failedLoginCount = 0;
    await this.updateUserLoginDetails(user)
    const payload = {};
    this.FIELDS_IN_PAYLOAD.forEach(field => {
        payload[field] = user[field];
    });
    return {
      access_token: await this.jwtService.signAsync(payload,
        {
        secret: this.JWT_SECRET,
      }),
    };
  }
}