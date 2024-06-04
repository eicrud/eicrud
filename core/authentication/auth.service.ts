import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { _utils } from '../utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../config/crud.config.service';
import { ModuleRef } from '@nestjs/core';
import { CrudAuthGuard } from './auth.guard';

export class AuthenticationOptions {
  saltRounds = 11;
  saltRoundsAdmin = 14;
  verificationEmailTimeoutHours = 24;
  twoFaEmailTimeoutMinutes = 15;
  passwordResetEmailTimeoutHours = 6;
  passwordMaxLength = 64;
  jwtFieldInPayload = ['revokedCount'];
  fieldsThatResetRevokedCount = ['password', 'email'];
  username_field = 'email';
  renewJwt = false;
  minTimeBetweenLoginAttempsMs: number = 600;
  allowedJwtExpiresIn = [
    '1s',
    '15m',
    '30m',
    '1h',
    '2h',
    '6h',
    '12h',
    '1d',
    '2d',
    '4d',
    '5d',
    '6d',
    '7d',
    '14d',
    '30d',
  ];
  extractUserOnRoutes: string[] = [];
  resetTokenLength: number = 17;
}

@Injectable()
export class CrudAuthService {
  protected JWT_SECRET: string;
  protected FIELDS_IN_PAYLOAD: string[] = ['revokedCount'];
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
      this.crudConfig.authenticationOptions.jwtFieldInPayload;
    this.FIELDS_IN_PAYLOAD.push(this.crudConfig.id_field);
    if (!this.FIELDS_IN_PAYLOAD.includes('revokedCount')) {
      this.FIELDS_IN_PAYLOAD.push('revokedCount');
    }
    this.username_field = this.crudConfig.authenticationOptions.username_field;
  }

  async signTokenForUser(
    user,
    expiresIn: string | number = '30m',
    addToPayload = {},
  ) {
    let payload = {};
    this.FIELDS_IN_PAYLOAD.forEach((field) => {
      payload[field] = user[field];
    });
    payload = { ...payload, ...addToPayload };
    return await this.jwtService.signAsync(payload, {
      secret: this.JWT_SECRET,
      expiresIn,
    });
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
