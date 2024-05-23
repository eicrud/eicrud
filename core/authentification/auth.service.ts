import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, UnauthorizedException, forwardRef } from '@nestjs/common';
import { CrudUserService } from '../user/crud-user.service';
import { JwtService } from '@nestjs/jwt';
import { _utils } from '../utils';

import * as bcrypt from 'bcrypt';
import { t } from '@mikro-orm/core';
import { CRUD_CONFIG_KEY, CrudConfigService } from '../crud/crud.config.service';
import { CrudErrors } from '../../shared/CrudErrors';
import { CrudUser } from '../user/model/CrudUser';
import { ModuleRef } from '@nestjs/core';
import { LoginResponseDto } from '../../shared/dtos';
import { CrudContext } from '../crud/model/CrudContext';
import { CrudAuthGuard } from './auth.guard';


export class AuthenticationOptions {
  SALT_ROUNDS = 11;
  SALT_ROUNDS_ADMIN = 14;
  VERIFICATION_EMAIL_TIMEOUT_HOURS = 6;
  TWOFA_EMAIL_TIMEOUT_MIN = 15;
  PASSWORD_RESET_EMAIL_TIMEOUT_HOURS = 6;
  PASSWORD_MAX_LENGTH = 64;
  JWT_SECRET = 'aeFzLsZAKL4153s9zsq2samXnv';
  JWT_FIELD_IN_PAYLOAD = ['revokedCount'];
  USERNAME_FIELD = 'email';
  renewJwt = true;
  minTimeBetweenLoginAttempsMs: number = 600;
}

@Injectable()
export class CrudAuthService {
  
  protected JWT_SECRET: string;
  protected FIELDS_IN_PAYLOAD: string[] = ['revokedCount'];
  protected USERNAME_FIELD = 'email';
  protected crudConfig: CrudConfigService;
  _authGuard: CrudAuthGuard;

  constructor(
    protected jwtService: JwtService,
    protected moduleRef: ModuleRef,
  ) {
  }

  onModuleInit() {
    this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY,{ strict: false })
    this.JWT_SECRET = this.crudConfig.authenticationOptions.JWT_SECRET;
    this.FIELDS_IN_PAYLOAD = this.crudConfig.authenticationOptions.JWT_FIELD_IN_PAYLOAD;
    this.FIELDS_IN_PAYLOAD.push(this.crudConfig.id_field);
    this.USERNAME_FIELD = this.crudConfig.authenticationOptions.USERNAME_FIELD;
  }

  async signTokenForUser(user, expiresIn: string | number = '30m'){
    const payload = {};
    this.FIELDS_IN_PAYLOAD.forEach(field => {
        payload[field] = user[field];
    });
    return await this.jwtService.signAsync(payload,
        {
        secret: this.JWT_SECRET,
        expiresIn
        });
  }

  async getJwtPayload(token: string) {
    try {
      const res = await this.jwtService.verifyAsync(
        token,
        {
          secret: this.JWT_SECRET,
        }
      );
      return res;
    } catch (e) {
      throw new UnauthorizedException(e.message);
    }
  }
}