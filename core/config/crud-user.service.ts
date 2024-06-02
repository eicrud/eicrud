import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, UnauthorizedException, forwardRef } from '@nestjs/common';
import { CrudService } from '../crud/crud.service';
import { CmdSecurity, CrudSecurity } from './model/CrudSecurity';
import { _utils } from '../utils';
import { CrudUser } from './model/CrudUser';
import { CrudContext } from '../crud/model/CrudContext';
import { CrudConfigService } from './crud.config.service';
import { CrudAuthorizationService } from '../crud/crud.authorization.service';
import { Loaded, Type } from '@mikro-orm/core';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { CrudAuthService } from '../authentification/auth.service';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ModuleRef } from '@nestjs/core';
import { $Transform } from '../validation/decorators';
import { UserIdDto } from '../crud/model/dtos';
import { LoginResponseDto, IResetPasswordDto, ISendPasswordResetEmailDto, IChangePasswordDto, ICreateAccountDto, ISendVerificationEmailDto } from '@eicrud/shared/interfaces';
import * as bcrypt from 'bcrypt';


export class CreateAccountDto implements ICreateAccountDto{
  @IsString()
  @$Transform((value ) => {
    return value.toLowerCase().trim()
  })
  email: string;

  @IsString()
  password: string;

  @IsString()
  role: string;
}

export class ResetPasswordDto implements IResetPasswordDto {
  @IsString()
  token_id: string;

  @IsString()
  newPassword: string;

  @IsString()
  expiresIn: string;
}
export class ChangePasswordDto implements IChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  newPassword: string;

  @IsString()
  expiresIn: string;
}

export class VerifyTokenDto {
  @IsString()
  token_id: string;
}

export class SendVerificationEmailDto implements ISendVerificationEmailDto {
  @IsEmail()
  @IsOptional()
  newEmail: string;

  @IsOptional()
  @IsString()
  password: string;
}

export class SendPasswordResetEmailDto implements ISendPasswordResetEmailDto{
  @IsEmail()
  email: string;
}

export const baseCmds = {
  sendVerificationEmail: {
    name: 'send_verification_email',
    dto: SendVerificationEmailDto
  },
  verifyEmail: {
    name: 'verify_email',
    dto: VerifyTokenDto
  },
  sendPasswordResetEmail: {
    name: 'send_password_reset_email',
    dto: SendPasswordResetEmailDto
  },
  resetPassword: {
    name: 'reset_password',
    dto: ResetPasswordDto
  },
  changePassword: {
    name: 'change_password',
    dto: ChangePasswordDto
  },
  createAccount: {
    name: 'create_account',
    dto: CreateAccountDto
  },
  logoutEverywhere: {
    name: 'logout_everywhere',
    dto: UserIdDto,
  }

}
@Injectable()
export class CrudUserService<T extends CrudUser> extends CrudService<T> {

  protected USERNAME_FIELD = 'email';

  protected authorizationService: CrudAuthorizationService;
  protected authService: CrudAuthService;

  rateLimitCount = 6;
  
  constructor(
  protected moduleRef: ModuleRef,
  private userEntityClass: new () => T,
  public security: CrudSecurity,
  ) {
    
    security = security || new CrudSecurity();
    super(moduleRef, userEntityClass, security);

    for(const cmdIndex in baseCmds){
      const cmd = baseCmds[cmdIndex];
      const cmdName = cmd.name;
      security.cmdSecurityMap = security.cmdSecurityMap || {} as any;
      security.cmdSecurityMap[cmdName] = security.cmdSecurityMap?.[cmdName] || {} as any;
      security.cmdSecurityMap[cmdName].secureOnly = true;
      if(!security.cmdSecurityMap[cmdName].dto){
        security.cmdSecurityMap[cmdName].dto = cmd.dto;
      }
    }
  }

  onModuleInit() {
    this.authorizationService = this.moduleRef.get(CrudAuthorizationService, { strict: false });
    this.authService = this.moduleRef.get(CrudAuthService, { strict: false });
    
    super.onModuleInit();

    this.USERNAME_FIELD = this.crudConfig.authenticationOptions.USERNAME_FIELD;  
  }

  override async $create(newEntity: T, ctx: CrudContext): Promise<any> {
    await this.checkPassword(newEntity);
    return super.$create(newEntity, ctx);
  }

  override async $patch(entity: T, newEntity: T, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.$patch(entity, newEntity, ctx);
  }

  override async $patchOne(query: T, newEntity: T, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.$patchOne(query, newEntity, ctx);
  }

  async checkPassword(newEntity: T) {
    if(newEntity.password){
      const rounds = this.crudConfig.getSaltRounds(newEntity);
      newEntity.saltRounds = rounds;
      newEntity.password = await _utils.hashPassword(newEntity.password, rounds);
    }
  }

  async checkUserBeforePatch(newEntity: T){
    await this.checkPassword(newEntity);
    this.checkFieldsThatIncrementRevokedCount(newEntity);
  }

  checkFieldsThatIncrementRevokedCount(newEntity: T){
    const fieldsThatResetRevokedCount = ['email', 'password'];
    if(fieldsThatResetRevokedCount.some(field => newEntity[field])){
      if(newEntity.revokedCount == null){
        throw new BadRequestException("revokedCount is required when updating " + fieldsThatResetRevokedCount.join(', '));
      }
      newEntity.revokedCount = newEntity.revokedCount + 1;
    }
  }

  getUserAgeInWeeks(user: CrudUser){
    return (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 7);
  }

  async timeoutUser(user: CrudUser, TIMEOUT_DURATION_MIN: number){
    this.addTimeoutToUser(user, TIMEOUT_DURATION_MIN);
    const patch: any = {timeout: user.timeout, timeoutCount: user.timeoutCount};
    this.$unsecure_fastPatchOne(user[this.crudConfig.id_field] , patch, null);
  }

  addTimeoutToUser(user: CrudUser, TIMEOUT_DURATION_MIN: number){
    user.timeoutCount = user.timeoutCount || 1;
    const duration = TIMEOUT_DURATION_MIN * 60 * 1000 * user.timeoutCount;
    user.timeout = new Date(Date.now() + duration);
    user.timeoutCount++;
  }

  async $computeTrust(user: CrudUser, ctx: CrudContext){
    const TRUST_COMPUTE_INTERVAL = 1000 * 60 * 60 * 24;
    if(ctx.userTrust){
      return ctx.userTrust;
    }
    if(user.lastComputedTrust && (new Date(user.lastComputedTrust).getTime() + TRUST_COMPUTE_INTERVAL) > Date.now()){
      ctx.userTrust = user.trust;
      return user.trust || 0;
    }
    let trust = 0;
    if(user.verifiedEmail){
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
    if(userRole.isAdminRole){
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

    if(user.didCaptcha){
      trust += 2;
    }

    if(trust <= 2){
      user.captchaRequested = true;
    }

    trust = await this.addToComputedTrust(user, trust, ctx);
    const patch: any = {trust, lastComputedTrust: new Date()};
    this.$unsecure_fastPatchOne(user[this.crudConfig.id_field] ,patch, ctx);
    user.trust = trust;
    ctx.userTrust = trust;
    user.lastComputedTrust = patch.lastComputedTrust;
    this.$setCached(user as any, ctx);
    return trust;
  }

  verifyTwoFA(user: Loaded<Partial<CrudUser>, never, "*", never>, twoFA_code: any) {
    
    if(user.lastTwoFACode !== twoFA_code){
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }
    if(new Date(user.lastTwoFACodeSent).getTime() + (this.crudConfig.authenticationOptions.TWOFA_EMAIL_TIMEOUT_MIN * 60 * 1000) < Date.now()){
      throw new UnauthorizedException(CrudErrors.TOKEN_EXPIRED.str());
    }

  }

  getVerificationEmailTimeoutHours(user: CrudUser){
    let emailCount = (user.verifiedEmailAttempCount || 1);
    if(emailCount > 10){
      emailCount = 10;
    }
    const timeout = emailCount * this.crudConfig.authenticationOptions.VERIFICATION_EMAIL_TIMEOUT_HOURS * 60 * 60 * 1000;
    return { emailCount, timeout};
  }

  getPasswordResetEmailTimeoutHours(user: CrudUser){
    let emailCount = (user.passwordResetAttempCount || 1);
    if(emailCount > 10){
      emailCount = 10;
    }
    const timeout = emailCount * this.crudConfig.authenticationOptions.PASSWORD_RESET_EMAIL_TIMEOUT_HOURS * 60 * 60 * 1000;
    return { emailCount, timeout};
  }

  async sendTokenEmail(email: string, user: CrudUser, ctx: CrudContext, lastEmailSentKey, { emailCount, timeout }, tokenKey,  sendEmailFunc, attempCountKey){
    const lastEmailSent = new Date(user[lastEmailSentKey]);

    if(emailCount < 2 
      || !lastEmailSent 
      || (lastEmailSent.getTime() + timeout ) >= Date.now()
      ){
      const token = _utils.generateRandomString(this.crudConfig.authenticationOptions.TOKEN_LENGTH);
      const patch: Partial<CrudUser> = {[tokenKey]: token, [lastEmailSentKey]: new Date(), [attempCountKey]: emailCount+1};
      if(user.email != email){
        patch.nextEmail = email;
      }
      await this.$unsecure_fastPatchOne(user[this.crudConfig.id_field], patch as any, ctx);
      await sendEmailFunc(email, token);
      return true;
    }

    return new BadRequestException(CrudErrors.EMAIL_ALREADY_SENT.str());
  }

  async useToken(user: CrudUser, token, ctx: CrudContext ,lastEmailVerificationSentKey, tokenKey, userGetTimeoutFunc, callBackFunc ){

    const lastEmailSent = new Date(user[lastEmailVerificationSentKey]);

    if(user && user[tokenKey] === token){
      //check if expired
      const { emailCount, timeout } = userGetTimeoutFunc(user);
      if(lastEmailSent && (Date.now() < lastEmailSent.getTime() + timeout) ){
          const patch = callBackFunc(user)
          await this.$unsecure_fastPatchOne(user[this.crudConfig.id_field], patch as any, ctx);
          return {...user, ...patch};
      }
    }
    return new BadRequestException(CrudErrors.TOKEN_EXPIRED.str());
  }

  async $send_verification_email(dto: SendVerificationEmailDto, ctx: CrudContext){

    if(dto?.newEmail){
      //Verify password
      const match = await bcrypt.compare(dto.password, ctx.user?.password);
      if (!match) {
        throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
      }
    }else{
      if(!ctx.userId){
        throw new ForbiddenException("Must be logged to send verification email");
      }
      if(ctx.user.verifiedEmail){
        return true;
      }
    }

    //Doing this for type checking
    const user: Partial<CrudUser> = { lastEmailVerificationSent: null, emailVerificationToken: null, verifiedEmailAttempCount: 0} 
    const keys = Object.keys(user); 
    return await this.sendTokenEmail(
      dto?.newEmail || ctx.user.email,
      ctx.user,
      ctx, 
      keys[0], 
      this.getVerificationEmailTimeoutHours(ctx.user), 
      keys[1], 
      (email, token) => this.crudConfig.emailService.sendVerificationEmail(email, token, ctx), 
      keys[2]);
  }

  async $verify_email(dto: VerifyTokenDto, ctx: CrudContext){
    const { token_id } = dto;
    const [ token, userId ] = token_id.split('_', 2);
    //Doing this for type checking
    const userType: Partial<CrudUser> = { lastEmailVerificationSent: null, emailVerificationToken: null} 
    const keys = Object.keys(userType); 
    const entity = {};
    entity[this.crudConfig.id_field] = userId;
    const user: CrudUser = await this.$findOne(entity, ctx) as any;
    if(user?.verifiedEmail && !user.nextEmail){
      return {};
    }
    const updatedUser = await this.useToken(
      user,
      token,
      ctx, 
      keys[0], 
      keys[1], 
      this.getVerificationEmailTimeoutHours,
       (user: CrudUser) => {
        const patch: Partial<CrudUser> = {verifiedEmail: true, verifiedEmailAttempCount: 0};
        if(user.nextEmail){
          patch.email = user.nextEmail;
          patch.nextEmail = null;
        }
        return patch;
      });
    return { accessToken: await this.authService.signTokenForUser(updatedUser)}
  }

  async $sendTwoFACode(userId: string, user: CrudUser, ctx: CrudContext){
    const lastTwoFACodeSent = new Date(user.lastTwoFACodeSent);
    if(lastTwoFACodeSent && (lastTwoFACodeSent.getTime() + (this.crudConfig.authenticationOptions.TWOFA_EMAIL_TIMEOUT_MIN * 60 * 1000)) > Date.now()){
      return new UnauthorizedException(CrudErrors.EMAIL_ALREADY_SENT.str());
    }
    const code = _utils.generateRandomString(6).toUpperCase();
    const twoFACodeCount = user.twoFACodeCount || 0;
    const patch: Partial<CrudUser> = {lastTwoFACode: code, lastTwoFACodeSent: new Date(), twoFACodeCount: twoFACodeCount+1};
    const proms = [];
    proms.push(this.crudConfig.emailService.sendTwoFactorEmail(user.email, code, ctx));
    proms.push(this.$unsecure_fastPatchOne(userId, patch as any, ctx));
    await Promise.all(proms);
    return true;
  }

  async $send_password_reset_email(dto: SendPasswordResetEmailDto, ctx: CrudContext){
        //Doing this for type checking
        const userObj: Partial<CrudUser> = { lastPasswordResetSent: null, passwordResetToken: null, passwordResetAttempCount: 0} 
        const keys = Object.keys(userObj); 
        const entity = {};
        entity[this.USERNAME_FIELD] = dto.email;
        const user: CrudUser = await this.$findOne(entity, ctx);
        if(!user){
          console.debug("User not found for email: ", dto.email);
          //Silent error
          return true;
        }
        try{
          return await this.sendTokenEmail(
            dto.email,
            user,
            ctx, 
            keys[0], 
            this.getPasswordResetEmailTimeoutHours(ctx.user), 
            keys[1], 
            (email, token) => this.crudConfig.emailService.sendPasswordResetEmail(email, token, ctx),
            keys[2]);
        } catch(e){ 
          //Silent error
          console.debug("Error sending password reset email: ", e);
          return true;
        }
  }

  async $reset_password(dto: ResetPasswordDto, ctx: CrudContext) {
    const ALLOWED_JWT_EXPIRES_IN = this.crudConfig.authenticationOptions.ALLOWED_JWT_EXPIRES_IN;
    if(dto.expiresIn && !ALLOWED_JWT_EXPIRES_IN.includes(dto.expiresIn)){
      throw new BadRequestException("Invalid expiresIn: " + dto.expiresIn + " allowed: " + ALLOWED_JWT_EXPIRES_IN.join(', '));
    }
    const { newPassword, token_id } = dto;
    const [ token, userId ] = token_id.split('_', 2);
    if(newPassword?.length > this.crudConfig.authenticationOptions.PASSWORD_MAX_LENGTH){
      throw new BadRequestException(CrudErrors.PASSWORD_TOO_LONG.str());
    }
     //Doing this for type checking
    const userType: Partial<CrudUser> = { lastPasswordResetSent: null, passwordResetToken: null} 
    const keys = Object.keys(userType); 
    const entity = {};
    entity[this.crudConfig.id_field] = userId;
    const user: CrudUser = await this.$findOne(entity, ctx) as any;
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
          revokedCount: user.revokedCount ?? 0,
          password: dto.newPassword, passwordResetAttempCount: 0
        };
        return patch;
      });
    return { accessToken: await this.authService.signTokenForUser(updatedUser, dto.expiresIn || undefined)}
  }  
  
  async $change_password(dto: ChangePasswordDto, ctx: CrudContext) {
    const ALLOWED_JWT_EXPIRES_IN = this.crudConfig.authenticationOptions.ALLOWED_JWT_EXPIRES_IN;
    if(dto.expiresIn && !ALLOWED_JWT_EXPIRES_IN.includes(dto.expiresIn)){
      throw new BadRequestException("Invalid expiresIn: " + dto.expiresIn + " allowed: " + ALLOWED_JWT_EXPIRES_IN.join(', '));
    }
    if(!ctx.userId){
      throw new ForbiddenException("Must be logged to change password");
    }
    const { newPassword, oldPassword } = dto;

    if(newPassword?.length > this.crudConfig.authenticationOptions.PASSWORD_MAX_LENGTH){
      throw new BadRequestException(CrudErrors.PASSWORD_TOO_LONG.str());
    }
    const user: CrudUser = ctx.user;
    const match = await bcrypt.compare(oldPassword, user?.password);
    if (!match) {
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }
    const patch: Partial<CrudUser> = {
      role: user.role, 
      revokedCount: user.revokedCount ?? 0,
      password: dto.newPassword, passwordResetAttempCount: 0
    };
    await this.$unsecure_fastPatchOne(user[this.crudConfig.id_field], patch as any, ctx);
    const updatedUser = {...user, ...patch};

    return { accessToken: await this.authService.signTokenForUser(updatedUser, dto.expiresIn || undefined)}
  }

  async $create_account(dto: CreateAccountDto, ctx: CrudContext, inheritance: any = {}){
      const { email, password, role } = dto;
      if(password?.length > this.crudConfig.authenticationOptions.PASSWORD_MAX_LENGTH){
        throw new BadRequestException(CrudErrors.PASSWORD_TOO_LONG.str());
      }
      const user = new this.userEntityClass();
      user.email = email.toLowerCase().trim();
      user.password = password;
      user.role = role;

      const res = await this.$create(user, ctx);

      return { userId: res[this.crudConfig.id_field], accessToken: await this.authService.signTokenForUser(res)}
  }

  async $authUser(ctx: CrudContext, user: CrudUser, pass, expiresIn = '30m', twoFA_code?){

    if(user.failedLoginCount >= this.rateLimitCount){
      const timeoutMS = Math.min(user.failedLoginCount*user.failedLoginCount*1000, 60000 * 5);
      const diffMs = _utils.diffBetweenDatesMs(new Date(), new Date(user.lastLoginAttempt));
      if(diffMs < timeoutMS){ 
          throw new HttpException({
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: CrudErrors.TOO_MANY_LOGIN_ATTEMPTS.str(Math.round((timeoutMS-diffMs)/1000) + " seconds"),
        }, 429);
      }
    }

    if(user.twoFA && this.crudConfig.emailService){
      if(!twoFA_code){
        await this.$sendTwoFACode(user[this.crudConfig.id_field], user as CrudUser, ctx);
        throw new UnauthorizedException(CrudErrors.TWOFA_REQUIRED.str());
      }
      await this.verifyTwoFA(user, twoFA_code);
    }
    
    user.lastLoginAttempt = new Date();

    const match = await bcrypt.compare(pass, user?.password);
    if (!match) {
      const addPatch: Partial<CrudUser> = this.dbAdapter.getSetUpdate({ lastLoginAttempt: user.lastLoginAttempt});
      const query: any = { [this.crudConfig.id_field]: user[this.crudConfig.id_field] };
      const increments = {failedLoginCount: 1}
      this.$unsecure_incPatch({ query, increments, addPatch }, ctx);

      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }

    let updatePass = null;
    if(user.saltRounds != this.crudConfig.getSaltRounds(user)){
      console.log("Updating password hash for user: ", user[this.crudConfig.id_field]);
      updatePass = pass;
    }

    user.failedLoginCount = 0;
    const patch = { failedLoginCount: 0, lastLoginAttempt: user.lastLoginAttempt} as Partial<CrudUser>;
    if(updatePass){
      patch.password = updatePass;
    }
    await this.$unsecure_fastPatchOne(user[this.crudConfig.id_field], patch as any, ctx);

    return {
      accessToken: await this.authService.signTokenForUser(user, expiresIn),
      userId: user[this.crudConfig.id_field],
    } as LoginResponseDto;
  }

  async $signIn(ctx: CrudContext, email, pass, expiresIn = '30m', twoFA_code?): Promise<LoginResponseDto> {
    email = email.toLowerCase().trim();
    const entity = {};
    entity[this.USERNAME_FIELD] = email;
    const user: CrudUser = await this.$findOne(entity, ctx);
    if(!user){
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }

    if(user?.timeout && new Date(user.timeout) > new Date()){
      throw new UnauthorizedException(CrudErrors.TIMED_OUT.str(new Date(user.timeout).toISOString()));
    }
    return await this.$authUser(ctx, user, pass, expiresIn, twoFA_code);
  }

  async $logout_everywhere(dto: UserIdDto, ctx: CrudContext, inheritance: any = {}){
    const query: any = { [this.crudConfig.id_field]: dto.userId };
    const user = (ctx.user?.[this.crudConfig.id_field] == dto.userId) ? ctx.user : await this.$findOne(query, ctx);
    user.revokedCount = user.revokedCount || 0;
    user.revokedCount++;
    const patch: any = { revokedCount: user.revokedCount};
    
    await Promise.all([
      this.$unsecure_fastPatch(query, patch, ctx),
      this.$setCached(user as any, ctx)
    ]);
  }

}