import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CrudUserService } from '../user/crud-user.service';
import { JwtService } from '@nestjs/jwt';
import { CrudService } from '../crud/crud.service';
import { _utils } from '../utils';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    protected usersService: CrudService<any>,
    protected jwtService: JwtService,
    protected JWT_SECRET: string,
    protected FIELDS_IN_PAYLOAD: string[] = ['_id', 'revokedCount'],
    protected USERNAME_FIELD = 'email',
    protected id_field = '_id',

  ) {}

  rateLimitCount = 6;

  async updateUserLoginDetails(user){
    await this.usersService.unsecure_fastPatchOne(user[this.id_field], {failedLoginCount: user.failedLoginCount, lastLoginAttempt: user.lastLoginAttempt}, null);
  }

  async signIn(email, pass) {
    const entity = {};
    entity[this.USERNAME_FIELD] = email;
    const user = await this.usersService.findOne(entity, null);
    if(!user){
      throw new UnauthorizedException("Unknown user.");
    }

    if(user.failedLoginCount >= this.rateLimitCount){
      const timeoutMS = user.failedLoginCount*user.failedLoginCount*1000;
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