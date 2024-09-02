import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LRUCache } from 'mnemonist';
import {
  CrudService,
  CrudServiceConfig,
  Inheritance,
} from '../crud/crud.service';
import { CrudSecurity } from './model/CrudSecurity';
import { _utils } from '../utils';
import { CrudUser } from './model/CrudUser';
import { CrudContext } from '../crud/model/CrudContext';
import { CrudAuthorizationService } from '../crud/crud.authorization.service';
import { Loaded } from '@mikro-orm/core';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { CrudAuthService } from '../authentication/auth.service';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ModuleRef } from '@nestjs/core';
import { UserIdDto } from '../crud/model/dtos';
import { LoginResponseDto } from '@eicrud/shared/interfaces';
import * as bcrypt from 'bcrypt';
import { TimeoutUserDto } from './basecmd_dtos/user/timeout_user.dto';
import { ChangePasswordDto } from './basecmd_dtos/user/change_password.dto';
import { CreateAccountDto } from './basecmd_dtos/user/create_account.dto';
import { ResetPasswordDto } from './basecmd_dtos/user/reset_password.dto';
import { SendPasswordResetEmailDto } from './basecmd_dtos/user/send_password_reset_email.dto';
import { SendVerificationEmailDto } from './basecmd_dtos/user/send_verification_email.dto';
import { VerifyEmailDto } from './basecmd_dtos/user/verify_email.dto';
import { LoginDto } from './basecmd_dtos/user/login.dto';

export class EmptyDto {
  @IsOptional()
  value: string;
}

export const baseCmds = {
  login: {
    name: 'login',
    dto: LoginDto,
    nonSecure: true,
  },
  checkJwt: {
    name: 'check_jwt',
    dto: EmptyDto,
    nonSecure: true,
  },
  logout: {
    name: 'logout',
    dto: EmptyDto,
    nonSecure: true,
  },
  timeoutUser: {
    name: 'timeout_user',
    dto: TimeoutUserDto,
  },
  sendVerificationEmail: {
    name: 'send_verification_email',
    dto: SendVerificationEmailDto,
  },
  verifyEmail: {
    name: 'verify_email',
    dto: VerifyEmailDto,
  },
  sendPasswordResetEmail: {
    name: 'send_password_reset_email',
    dto: SendPasswordResetEmailDto,
    nonSecure: true,
  },
  resetPassword: {
    name: 'reset_password',
    dto: ResetPasswordDto,
  },
  changePassword: {
    name: 'change_password',
    dto: ChangePasswordDto,
  },
  createAccount: {
    name: 'create_account',
    dto: CreateAccountDto,
    nonSecure: true,
  },
  logoutEverywhere: {
    name: 'logout_everywhere',
    dto: UserIdDto,
  },
};
@Injectable()
export class CrudUserService<T extends CrudUser> extends CrudService<T> {
  protected username_field = 'email';
  userLastLoginAttemptMap: LRUCache<string, Date>;

  protected authorizationService: CrudAuthorizationService;
  protected authService: CrudAuthService;

  rateLimitCount = 6;

  constructor(
    protected moduleRef: ModuleRef,
    entity: new () => T,
    security: CrudSecurity<T>,
    config?: CrudServiceConfig<T>,
  ) {
    security = security || new CrudSecurity();
    super(moduleRef, entity, security, config);

    for (const cmdIndex in baseCmds) {
      const cmd = baseCmds[cmdIndex];
      const cmdName = cmd.name;
      security.cmdSecurityMap = security.cmdSecurityMap || ({} as any);
      security.cmdSecurityMap[cmdName] =
        security.cmdSecurityMap?.[cmdName] || ({} as any);
      if (security.cmdSecurityMap[cmdName].secureOnly == null) {
        security.cmdSecurityMap[cmdName].secureOnly = cmd.nonSecure
          ? false
          : true;
      }
      if (!security.cmdSecurityMap[cmdName].dto) {
        security.cmdSecurityMap[cmdName].dto = cmd.dto;
      }
    }
  }

  onModuleInit() {
    this.authorizationService = this.moduleRef.get(CrudAuthorizationService, {
      strict: false,
    });
    this.authService = this.moduleRef.get(CrudAuthService, { strict: false });

    super.onModuleInit();

    this.userLastLoginAttemptMap = new LRUCache(
      this.crudConfig.watchTrafficOptions.maxTrackedUsers / 2,
    );
    this.username_field = this.crudConfig.authenticationOptions.username_field;
  }

  override async $create(newEntity: T, ctx: CrudContext): Promise<any> {
    await this.checkPassword(newEntity);
    return super.$create(newEntity, ctx);
  }

  override async $patch(entity: T, newEntity: T, ctx: CrudContext) {
    const revoked = await this.checkUserBeforePatch(newEntity, ctx);
    const res = await super.$patch(entity, newEntity, ctx);
    if (revoked && entity[this.crudConfig.id_field]) {
      this.$deleteCached(entity, ctx);
    }
    return res;
  }

  override async $patchOne(query: T, newEntity: T, ctx: CrudContext) {
    const revoked = await this.checkUserBeforePatch(newEntity, ctx);
    const res = await super.$patchOne(query, newEntity, ctx);
    if (revoked && query[this.crudConfig.id_field]) {
      this.$deleteCached(query, ctx);
    }
    return res;
  }

  async checkPassword(newEntity: T) {
    if (newEntity.password) {
      const rounds = this.crudConfig.getSaltRounds(newEntity);
      newEntity.saltRounds = rounds;
      newEntity.password = await _utils.hashPassword(
        newEntity.password,
        rounds,
      );
    }
  }

  async checkUserBeforePatch(newEntity: T, ctx: CrudContext) {
    await this.checkPassword(newEntity);
    const revoked = this.checkFieldsThatIncrementRevokedCount(newEntity);
    return revoked;
  }

  checkFieldsThatIncrementRevokedCount(newEntity: T) {
    const fieldsThatResetRevokedCount =
      this.crudConfig.authenticationOptions.fieldsThatResetRevokedCount;
    if (fieldsThatResetRevokedCount.some((field) => newEntity[field])) {
      if (newEntity.rvkd == null) {
        throw new BadRequestException(
          'rvkd is required when updating ' +
            fieldsThatResetRevokedCount.join(', '),
        );
      }
      newEntity.rvkd = newEntity.rvkd + 1;
      return true;
    }
    return false;
  }

  getUserAgeInWeeks(user: CrudUser) {
    return (
      (Date.now() - new Date(user.createdAt).getTime()) /
      (1000 * 60 * 60 * 24 * 7)
    );
  }

  async $timeout_user(dto: TimeoutUserDto, ctx: CrudContext) {
    const user = await this.$findOne(
      { [this.crudConfig.id_field]: dto.userId } as any,
      ctx,
    );
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (dto.allowedRoles && !dto.allowedRoles.includes(user.role)) {
      throw new UnauthorizedException(
        'Not allowed to timeout user of role ' + user.role,
      );
    }
    this.addTimeoutToUser(user, dto.timeoutDurationMinutes);
    const patch: any = {
      timeout: user.timeout,
      timeoutCount: user.timeoutCount,
    };
    this.$unsecure_fastPatchOne(user[this.crudConfig.id_field], patch, null);
  }

  async $logout(dto: EmptyDto, ctx: CrudContext) {
    ctx.setCookies = ctx.setCookies || {};
    ctx.setCookies['eicrud-jwt'] = {
      value: '',
      httpOnly: true,
      maxAge: 0,
      path: '/',
    };
  }

  addTimeoutToUser(user: CrudUser, timeoutDurationMinutes: number) {
    user.timeoutCount = user.timeoutCount || 1;
    const duration = timeoutDurationMinutes * 60 * 1000 * user.timeoutCount;
    user.timeout = new Date(Date.now() + duration);
    user.timeoutCount++;
  }

  async $computeTrust(user: CrudUser, ctx: CrudContext) {
    const TRUST_COMPUTE_INTERVAL = 1000 * 60 * 60 * 24;
    if (ctx.userTrust) {
      return ctx.userTrust;
    }
    if (
      user.lastComputedTrust &&
      new Date(user.lastComputedTrust).getTime() + TRUST_COMPUTE_INTERVAL >
        Date.now()
    ) {
      ctx.userTrust = user.trust;
      return user.trust || 0;
    }
    let trust = 0;
    if (user.verifiedEmail) {
      trust += 4;
    }
    const getUserAgeInWeeks = this.getUserAgeInWeeks(user);
    const weekThresholds = [1, 4, 12, 24, 48];
    for (let threshold of weekThresholds) {
      if (getUserAgeInWeeks >= threshold) {
        trust += 1;
      }
    }

    const userRole = this.authorizationService.getUserRole(user);
    if (userRole.isAdminRole) {
      trust += 4;
    }

    const incidentThresholds = [1, 100, 1000];
    for (let threshold of incidentThresholds) {
      if (user.incidentCount >= threshold) {
        trust -= 2;
      }
    }

    const highTraficThresholds = [1, 10, 100, 1000];
    for (let threshold of highTraficThresholds) {
      if (user.highTrafficCount >= threshold) {
        trust -= 2;
      }
    }

    const errorThresholds = [1, 100, 1000];
    for (let threshold of errorThresholds) {
      if (user.errorCount >= threshold) {
        trust -= 1;
      }
    }

    if (user.didCaptcha) {
      trust += 2;
    }

    trust = await this.addToComputedTrust(user, trust, ctx);

    const patch: any = { trust, lastComputedTrust: new Date() };
    if (trust <= 2) {
      user.captchaRequested = true;
      patch.captchaRequested = true;
    }
    this.$unsecure_fastPatchOne(user[this.crudConfig.id_field], patch, ctx);
    user.trust = trust;
    ctx.userTrust = trust;
    user.lastComputedTrust = patch.lastComputedTrust;
    this.$setCached(user as any, ctx);
    return trust;
  }

  verifyTwoFA(
    user: Loaded<Partial<CrudUser>, never, '*', never>,
    twoFA_code: any,
  ) {
    if (!user.lastTwoFACode || user.lastTwoFACode !== twoFA_code) {
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }
    if (
      new Date(user.lastTwoFACodeSent).getTime() +
        this.crudConfig.authenticationOptions.twoFaEmailTimeoutMinutes *
          60 *
          1000 <
      Date.now()
    ) {
      throw new UnauthorizedException(CrudErrors.TOKEN_EXPIRED.str());
    }
  }

  getVerificationEmailTimeoutHours(user: CrudUser) {
    let emailCount = user.verifiedEmailAttempCount || 0;

    const timeout =
      this.crudConfig.authenticationOptions.verificationEmailTimeoutHours *
      60 *
      60 *
      1000;
    return { emailCount, timeout };
  }

  getPasswordResetEmailTimeoutHours(user: CrudUser) {
    let emailCount = user.passwordResetAttempCount || 0;

    const timeout =
      this.crudConfig.authenticationOptions.passwordResetEmailTimeoutHours *
      60 *
      60 *
      1000;
    return { emailCount, timeout };
  }

  async addToComputedTrust(
    user: CrudUser,
    trust: number,
    ctx: CrudContext,
  ): Promise<number> {
    return trust;
  }

  async sendTokenEmail(
    email: string,
    user: CrudUser,
    ctx: CrudContext,
    lastEmailSentKey,
    { emailCount, timeout },
    tokenKey,
    sendEmailFunc,
    attempCountKey,
  ) {
    const lastEmailSent = new Date(user[lastEmailSentKey]);

    if (
      emailCount < 2 ||
      !lastEmailSent ||
      Date.now() >= lastEmailSent.getTime() + timeout
    ) {
      const rnd = await _utils.generateRandomString(
        this.crudConfig.authenticationOptions.resetTokenLength,
      );
      const patch: Partial<CrudUser> = {
        [tokenKey]: rnd,
        [lastEmailSentKey]: new Date(),
        [attempCountKey]: emailCount + 1,
      };
      if (user.email != email) {
        patch.nextEmail = email;
      }
      await this.$unsecure_fastPatchOne(
        user[this.crudConfig.id_field],
        patch as any,
        ctx,
      );
      const token = rnd + '_' + user[this.crudConfig.id_field];
      await sendEmailFunc(email, token);
      return true;
    }

    return new BadRequestException(CrudErrors.EMAIL_ALREADY_SENT.str());
  }

  async useToken(
    user: CrudUser,
    token,
    ctx: CrudContext,
    lastEmailVerificationSentKey,
    tokenKey,
    userGetTimeoutFunc,
    callBackFunc,
  ) {
    const lastEmailSent = new Date(user[lastEmailVerificationSentKey]);

    if (user && user[tokenKey] === token) {
      //check if expired
      const { emailCount, timeout } = userGetTimeoutFunc(user);
      if (lastEmailSent && Date.now() < lastEmailSent.getTime() + timeout) {
        const patch = callBackFunc(user);
        await this.$unsecure_fastPatchOne(
          user[this.crudConfig.id_field],
          patch as any,
          ctx,
        );
        return { ...user, ...patch };
      }
    }
    return new BadRequestException(CrudErrors.TOKEN_EXPIRED.str());
  }

  async $send_verification_email(
    dto: SendVerificationEmailDto,
    ctx: CrudContext,
  ) {
    if (dto?.newEmail) {
      const userWithNewEmail = await this.$findOne(
        { email: dto.newEmail } as any,
        ctx,
      );
      if (userWithNewEmail) {
        throw new BadRequestException(CrudErrors.EMAIL_ALREADY_TAKEN.str());
      }

      //Verify password
      const match = await bcrypt.compare(dto.password, ctx.user?.password);
      if (!match) {
        throw new BadRequestException(CrudErrors.INVALID_CREDENTIALS.str());
      }
    } else {
      if (!ctx.userId) {
        throw new ForbiddenException(
          'Must be logged to send verification email',
        );
      }
      if (ctx.user.verifiedEmail) {
        return true;
      }
    }

    //Doing this for type checking
    const user: Partial<CrudUser> = {
      lastEmailVerificationSent: null,
      emailVerificationToken: null,
      verifiedEmailAttempCount: 0,
    };
    const keys = Object.keys(user);
    return await this.sendTokenEmail(
      dto?.newEmail || ctx.user.email,
      ctx.user,
      ctx,
      keys[0],
      this.getVerificationEmailTimeoutHours(ctx.user),
      keys[1],
      (email, token) =>
        this.crudConfig.emailService.sendVerificationEmail(email, token, ctx),
      keys[2],
    );
  }

  async $verify_email(dto: VerifyEmailDto, ctx: CrudContext) {
    const { token_id } = dto;
    const [token, userId] = token_id.split('_', 2);
    //Doing this for type checking
    const userType: Partial<CrudUser> = {
      lastEmailVerificationSent: null,
      emailVerificationToken: null,
    };
    const keys = Object.keys(userType);
    const entity = {};
    entity[this.crudConfig.id_field] = userId;
    const user: CrudUser = (await this.$findOne(entity, ctx)) as any;
    if (!user) {
      throw new BadRequestException(CrudErrors.USER_NOT_FOUND.str());
    }
    if (user?.verifiedEmail && !user.nextEmail) {
      return {};
    }
    const updatedUser = await this.useToken(
      user,
      token,
      ctx,
      keys[0],
      keys[1],
      (user) => this.getVerificationEmailTimeoutHours(user),
      (user: CrudUser) => {
        const patch: Partial<CrudUser> = {
          verifiedEmail: true,
          verifiedEmailAttempCount: 0,
        };
        if (user.nextEmail) {
          patch.rvkd = user.rvkd ?? 0;
          patch.email = user.nextEmail;
          patch.nextEmail = null;
        }
        return patch;
      },
    );
    return {
      accessToken: dto.logMeIn
        ? await this.authService.signTokenForUser(ctx, updatedUser)
        : undefined,
    };
  }

  async $sendTwoFACode(userId: string, user: CrudUser, ctx: CrudContext) {
    const lastTwoFACodeSent = new Date(user.lastTwoFACodeSent);
    if (
      lastTwoFACodeSent &&
      lastTwoFACodeSent.getTime() +
        this.crudConfig.authenticationOptions.twoFaEmailTimeoutMinutes *
          60 *
          1000 >
        Date.now()
    ) {
      return new UnauthorizedException(CrudErrors.EMAIL_ALREADY_SENT.str());
    }
    const code = (await _utils.generateRandomString(6)).toUpperCase();
    const twoFACodeCount = user.twoFACodeCount || 0;
    const patch: Partial<CrudUser> = {
      lastTwoFACode: code,
      lastTwoFACodeSent: new Date(),
      twoFACodeCount: twoFACodeCount + 1,
    };
    const proms = [];
    proms.push(
      this.crudConfig.emailService.sendTwoFactorEmail(user.email, code, ctx),
    );
    proms.push(this.$unsecure_fastPatchOne(userId, patch as any, ctx));
    await Promise.all(proms);
    return true;
  }

  async $send_password_reset_email(
    dto: SendPasswordResetEmailDto,
    ctx: CrudContext,
  ) {
    //Doing this for type checking
    const userObj: Partial<CrudUser> = {
      lastPasswordResetSent: null,
      passwordResetToken: null,
      passwordResetAttempCount: 0,
    };
    const keys = Object.keys(userObj);
    const entity = {};
    entity[this.username_field] = dto.email;
    const user: CrudUser = await this.$findOne(entity, ctx);
    if (!user) {
      console.debug('User not found for email: ', dto.email);
      //Silent error
      return true;
    }
    try {
      return await this.sendTokenEmail(
        dto.email,
        user,
        ctx,
        keys[0],
        this.getPasswordResetEmailTimeoutHours(ctx.user),
        keys[1],
        (email, token) =>
          this.crudConfig.emailService.sendPasswordResetEmail(
            email,
            token,
            ctx,
          ),
        keys[2],
      );
    } catch (e) {
      //Silent error
      console.debug('Error sending password reset email: ', e);
      return true;
    }
  }

  async $reset_password(dto: ResetPasswordDto, ctx: CrudContext) {
    const maxJwtexpiresInSec =
      this.crudConfig.authenticationOptions.maxJwtexpiresInSec;
    if (dto.expiresInSec && dto.expiresInSec > maxJwtexpiresInSec) {
      throw new BadRequestException(
        'Invalid expiresInSec: ' +
          dto.expiresInSec +
          ' max: ' +
          maxJwtexpiresInSec,
      );
    }
    const { newPassword, token_id } = dto;
    const [token, userId] = token_id.split('_', 2);
    if (
      newPassword?.length >
      this.crudConfig.authenticationOptions.passwordMaxLength
    ) {
      throw new BadRequestException(CrudErrors.PASSWORD_TOO_LONG.str());
    }
    //Doing this for type checking
    const userType: Partial<CrudUser> = {
      lastPasswordResetSent: null,
      passwordResetToken: null,
    };
    const keys = Object.keys(userType);
    const entity = {};
    entity[this.crudConfig.id_field] = userId;
    const user: CrudUser = (await this.$findOne(entity, ctx)) as any;
    if (!user) {
      throw new BadRequestException(CrudErrors.USER_NOT_FOUND.str());
    }
    const updatedUser = await this.useToken(
      user,
      token,
      ctx,
      keys[0],
      keys[1],
      (user) => this.getPasswordResetEmailTimeoutHours(user),
      (user: CrudUser) => {
        const patch: Partial<CrudUser> = {
          role: user.role,
          rvkd: user.rvkd ?? 0,
          password: dto.newPassword,
          passwordResetAttempCount: 0,
        };
        return patch;
      },
    );
    return {
      accessToken: dto.logMeIn
        ? await this.authService.signTokenForUser(
            ctx,
            updatedUser,
            dto.expiresInSec || undefined,
          )
        : undefined,
    };
  }

  async $change_password(dto: ChangePasswordDto, ctx: CrudContext) {
    const maxJwtexpiresInSec =
      this.crudConfig.authenticationOptions.maxJwtexpiresInSec;
    if (dto.expiresInSec && dto.expiresInSec > maxJwtexpiresInSec) {
      throw new BadRequestException(
        'Invalid expiresInSec: ' +
          dto.expiresInSec +
          ' max: ' +
          maxJwtexpiresInSec,
      );
    }
    if (!ctx.userId) {
      throw new ForbiddenException('Must be logged to change password');
    }
    const { newPassword, oldPassword } = dto;

    if (
      newPassword?.length >
      this.crudConfig.authenticationOptions.passwordMaxLength
    ) {
      throw new BadRequestException(CrudErrors.PASSWORD_TOO_LONG.str());
    }
    const user: CrudUser = ctx.user;
    const match = await bcrypt.compare(oldPassword, user?.password);
    if (!match) {
      throw new BadRequestException(CrudErrors.INVALID_CREDENTIALS.str());
    }
    const patch: Partial<CrudUser> = {
      role: user.role,
      rvkd: user.rvkd ?? 0,
      password: dto.newPassword,
      passwordResetAttempCount: 0,
    };
    await this.$unsecure_fastPatchOne(
      user[this.crudConfig.id_field],
      patch as any,
      ctx,
    );
    const updatedUser = { ...user, ...patch };

    return {
      accessToken: dto.logMeIn
        ? await this.authService.signTokenForUser(
            ctx,
            updatedUser,
            dto.expiresInSec || undefined,
          )
        : undefined,
    };
  }

  async $create_account(
    dto: CreateAccountDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    let { email, password, role } = dto;
    if (
      password?.length > this.crudConfig.authenticationOptions.passwordMaxLength
    ) {
      throw new BadRequestException(CrudErrors.PASSWORD_TOO_LONG.str());
    }

    email = email.toLowerCase().trim();

    const user = new this.entity();
    user.email = email;
    user.password = password;
    user.role = role;
    let res;
    try {
      res = await this.$create(user, ctx);
    } catch (e) {
      console.error('Error creating user: ', e);
      if (['duplicate', 'key', 'email'].every((k) => e.message?.includes(k))) {
        throw new BadRequestException(CrudErrors.EMAIL_ALREADY_TAKEN.str());
      }
      throw e;
    }

    this.crudConfig.emailService?.sendAccountCreationEmail(
      user.email,
      res,
      ctx,
    );
    return {
      userId: res[this.crudConfig.id_field],
      accessToken: dto.logMeIn
        ? await this.authService.signTokenForUser(ctx, res)
        : undefined,
    };
  }

  async $authUser(ctx: CrudContext, user: CrudUser, dto: LoginDto) {
    const userSuccessPatch: any = {};
    if (user.failedLoginCount >= this.rateLimitCount) {
      const timeoutMS = Math.min(
        user.failedLoginCount * user.failedLoginCount * 1000,
        60000 * 5,
      );
      const diffMs = _utils.diffBetweenDatesMs(
        new Date(),
        new Date(user.lastLoginAttempt),
      );
      if (diffMs < timeoutMS) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: CrudErrors.TOO_MANY_LOGIN_ATTEMPTS.str(
              Math.round((timeoutMS - diffMs) / 1000) + ' seconds',
            ),
          },
          429,
        );
      }
    }

    if (user.twoFA && this.crudConfig.emailService) {
      if (!dto.twoFA_code) {
        await this.$sendTwoFACode(
          user[this.crudConfig.id_field],
          user as CrudUser,
          ctx,
        );
        throw new UnauthorizedException(CrudErrors.TWOFA_REQUIRED.str());
      }
      await this.verifyTwoFA(user, dto.twoFA_code);
      user.lastTwoFACode = null;
      userSuccessPatch.lastTwoFACode = user.lastTwoFACode;
      user.lastTwoFACodeSent = new Date(0);
      userSuccessPatch.lastTwoFACodeSent = user.lastTwoFACodeSent;
    }

    user.lastLoginAttempt = new Date();
    userSuccessPatch.lastLoginAttempt = user.lastLoginAttempt;

    const match = await bcrypt.compare(dto.password, user?.password);
    if (!match) {
      const addPatch = { lastLoginAttempt: user.lastLoginAttempt };
      const query: any = {
        [this.crudConfig.id_field]: user[this.crudConfig.id_field],
      };
      const increments = { failedLoginCount: 1 };
      this.$unsecure_incPatch({ query, increments, addPatch }, ctx);

      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }

    let updatePass = null;
    if (user.saltRounds != this.crudConfig.getSaltRounds(user)) {
      console.log(
        'Updating password hash for user: ',
        user[this.crudConfig.id_field],
      );
      updatePass = dto.password;
    }

    user.failedLoginCount = 0;
    userSuccessPatch.failedLoginCount = user.failedLoginCount;

    if (updatePass) {
      userSuccessPatch.password = updatePass;
    }
    await this.$unsecure_fastPatchOne(
      user[this.crudConfig.id_field],
      userSuccessPatch as any,
      ctx,
    );

    return ctx.authType == 'basic'
      ? user
      : ({
          accessToken: await this.authService.signTokenForUser(
            ctx,
            user,
            dto.expiresInSec,
          ),
          userId: user[this.crudConfig.id_field],
        } as LoginResponseDto);
  }

  async $login(dto: LoginDto, ctx: CrudContext, inheritance?: Inheritance) {
    const lastLogingAttempt: Date = this.userLastLoginAttemptMap.get(dto.email);
    const now = new Date();
    if (
      lastLogingAttempt &&
      _utils.diffBetweenDatesMs(now, lastLogingAttempt) <
        this.crudConfig.authenticationOptions.minTimeBetweenLoginAttempsMs
    ) {
      throw new HttpException(
        {
          statusCode: 425,
          error: 'Too early',
          message: CrudErrors.TOO_MANY_LOGIN_ATTEMPTS.str(),
        },
        425,
      );
    }

    this.userLastLoginAttemptMap.set(dto.email, now);

    const maxJwtexpiresInSec =
      this.crudConfig.authenticationOptions.maxJwtexpiresInSec;
    if (dto.expiresInSec && dto.expiresInSec > maxJwtexpiresInSec) {
      throw new BadRequestException(
        'Invalid expiresInSec: ' +
          dto.expiresInSec +
          ' max: ' +
          maxJwtexpiresInSec,
      );
    }

    if (
      dto.password?.length >
      this.crudConfig.authenticationOptions.passwordMaxLength
    ) {
      throw new UnauthorizedException(CrudErrors.PASSWORD_TOO_LONG.str());
    }

    const entity = {};
    entity[this.username_field] = dto.email;

    const user: CrudUser = await this.$findOne(entity, ctx);

    if (!user) {
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }

    if (user?.timeout && new Date(user.timeout) > new Date()) {
      throw new UnauthorizedException(
        CrudErrors.TIMED_OUT.str(new Date(user.timeout).toISOString()),
      );
    }
    return await this.$authUser(ctx, user, dto);
  }

  async $logout_everywhere(
    dto: UserIdDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    const query: any = { [this.crudConfig.id_field]: dto.userId };
    const user =
      ctx.user?.[this.crudConfig.id_field] == dto.userId
        ? ctx.user
        : await this.$findOne(query, ctx);
    user.rvkd = user.rvkd || 0;
    user.rvkd++;
    const patch: any = { rvkd: user.rvkd };

    await Promise.all([
      this.$unsecure_fastPatch(query, patch, ctx),
      this.$setCached(user as any, ctx),
    ]);
  }

  async $renewJwt(
    ctx: CrudContext,
    addToPayload?,
  ): Promise<{ accessToken: string; refreshTokenSec: number }> {
    const userRole = this.crudAuthorization.getUserRole(ctx.user);
    let ret = { accessToken: null, refreshTokenSec: null };
    if (
      this.crudConfig.authenticationOptions.renewJwt &&
      !userRole.noTokenRefresh &&
      !ctx?.user?.noTokenRefresh
    ) {
      const totalSec = ctx.jwtPayload.exp - ctx.jwtPayload.iat;
      const elapsedMs = new Date().getTime() - ctx.jwtPayload.iat * 1000;
      const thresholdMs = totalSec * 1000 * this.reciprocal20percent; // 20% of total time
      if (elapsedMs >= thresholdMs) {
        const newToken = await this.authService.signTokenForUser(
          ctx,
          ctx.user,
          totalSec,
          addToPayload,
        );
        if (!ctx.jwtPayload.csrf) {
          // indicates that the token is stored in the client's local storage
          ret.accessToken = newToken;
          ret.refreshTokenSec = totalSec;
        }
      }
    }
    return ret;
  }

  reciprocal20percent = 1 / 20;
  async $check_jwt(dto: any, ctx: CrudContext) {
    const userId = ctx.user[this.crudConfig.id_field];
    if (!userId) {
      throw new UnauthorizedException('User not found.');
    }
    const ret: Partial<LoginResponseDto> = await this.$renewJwt(ctx);
    ret.userId = userId;
    return ret;
  }
}
