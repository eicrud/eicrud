import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { _utils } from '../utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../config/crud.config.service';
import { ModuleRef } from '@nestjs/core';
import { CrudAuthGuard } from './auth.guard';
import { CrudContext } from '../crud';

export class AuthenticationOptions {
  saltRounds = 11;
  saltRoundsAdmin = 14;
  verificationEmailTimeoutHours = 24;
  twoFaEmailTimeoutMinutes = 15;
  passwordResetEmailTimeoutHours = 6;
  passwordMaxLength = 64;
  userFieldsInJwtPayload = ['rvkd'];
  fieldsThatResetRevokedCount = ['password', 'email'];
  username_field = 'email';
  renewJwt = false;
  minTimeBetweenLoginAttempsMs: number = 600;
  maxJwtexpiresInSec = 60 * 60 * 24 * 30;
  extractUserOnRoutes: string[] = [];
  resetTokenLength: number = 17;
}

@Injectable()
export class CrudAuthService {
  protected JWT_SECRET: string;
  protected FIELDS_IN_PAYLOAD: string[] = ['rvkd'];
  protected username_field = 'email';
  protected crudConfig: CrudConfigService;
  _authGuard: CrudAuthGuard;

  constructor(
    protected jwtService: JwtService,
    protected moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false });
    this.JWT_SECRET = this.crudConfig.JWT_SECRET;
    this.FIELDS_IN_PAYLOAD =
      this.crudConfig.authenticationOptions.userFieldsInJwtPayload;
    this.FIELDS_IN_PAYLOAD.push(this.crudConfig.id_field);
    if (!this.FIELDS_IN_PAYLOAD.includes('rvkd')) {
      this.FIELDS_IN_PAYLOAD.push('rvkd');
    }
    this.username_field = this.crudConfig.authenticationOptions.username_field;
  }

  async signTokenForUser(
    ctx: CrudContext,
    user,
    expiresInSec: number = 60 * 30,
    addToPayload = {},
  ) {
    let payload = {};
    this.FIELDS_IN_PAYLOAD.forEach((field) => {
      payload[field] = user[field];
    });
    payload = { ...payload, ...addToPayload };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.JWT_SECRET,
      expiresIn: expiresInSec,
    });
    if (ctx) {
      ctx.setCookies = ctx.setCookies || {};
      ctx.setCookies['eicrud-jwt'] = {
        value: token,
        httpOnly: true,
        secure: true,
        maxAge: expiresInSec,
        path: '/',
      };
    }
    return token;
  }

  async getJwtPayload(token: string) {
    try {
      const res = await this.jwtService.verifyAsync(token, {
        secret: this.JWT_SECRET,
      });
      return res;
    } catch (e) {
      throw new UnauthorizedException(e.message);
    }
  }
}
