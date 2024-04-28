import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException, forwardRef } from '@nestjs/common';
import { CrudService } from '../crud/crud.service';
import { CmdSecurity, CrudSecurity } from '../crud/model/CrudSecurity';
import { _utils } from '../utils';
import { CrudUser } from './model/CrudUser';
import { CrudContext } from '../crud/model/CrudContext';
import { CrudConfigService } from '../crud/crud.config.service';
import { CrudAuthorizationService } from '../crud/crud.authorization.service';
import { Loaded, Type } from '@mikro-orm/core';
import { CrudErrors } from '../crud/model/CrudErrors';
import { CrudAuthService } from '../authentification/auth.service';
import { IsString } from 'class-validator';


export class CreateAccountDto {
  @IsString()
  email: string;
  @IsString()
  password: string;
}
@Injectable()
export class CrudUserService<T extends CrudUser> extends CrudService<T> {

  baseCmds = {
    sendVerificationEmail: {
      name: 'sendVerificationEmail'
    },
    verifyEmail: {
      name: 'verifyEmail'
    },
    sendPasswordResetEmail: {
      name: 'sendPasswordResetEmail'
    },
    resetPassword: {
      name: 'resetPassword'
    },
    createAccount: {
      name: 'createAccount',
      dto: CreateAccountDto
    }

  }

  constructor(@Inject(forwardRef(() => CrudConfigService))
  protected crudConfig: CrudConfigService,
  protected authorizationService: CrudAuthorizationService,
  @Inject(forwardRef(() => CrudAuthService))
  protected authService: CrudAuthService,
  public security: CrudSecurity,
  private userEntityClass: new () => T
  ) {
    security = security || new CrudSecurity();
    super(crudConfig, Type<CrudUser>, security);
    for(const cmd in this.baseCmds){
      security.cmdSecurityMap[cmd] = security.cmdSecurityMap[cmd] || {};
      security.cmdSecurityMap[cmd].secureOnly = true;
      if(!security.cmdSecurityMap[cmd].dto){
        security.cmdSecurityMap[cmd].dto = this.baseCmds[cmd].dto;
      }
    }
  }

  override async create(newEntity: T, ctx: CrudContext): Promise<any> {
    await this.checkPassword(newEntity);
    return super.create(newEntity, ctx);
  }

  override async unsecure_fastCreate(newEntity: T, ctx: CrudContext): Promise<any> {
    await this.checkPassword(newEntity);
    return super.unsecure_fastCreate(newEntity, ctx);
  }


  override async patch(entity: T, newEntity: T, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.patch(entity, newEntity, ctx);
  }

  override async patchOne(id: string, newEntity: T, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.patchOne(id, newEntity, ctx);
  }

  override async unsecure_fastPatch(query: T, newEntity: T, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.unsecure_fastPatch(query, newEntity, ctx);
  }

  override async unsecure_fastPatchOne(id: string, newEntity: T, ctx: CrudContext) {
      await this.checkPassword(newEntity);
      this.checkFieldsThatIncrementRevokedCount(newEntity);
      return super.unsecure_fastPatchOne(id, newEntity, ctx);
  }

  override async putOne(newEntity: T, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.putOne(newEntity, ctx);
  }

  override async unsecure_fastPutOne(newEntity: T, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.unsecure_fastPutOne(newEntity, ctx);
  }

  async checkPassword(newEntity: T) {
    if(newEntity.password){
      newEntity.password = await _utils.hashPassword(newEntity.password);
    }
  }

  async checkUserBeforePatch(newEntity: T){
    await this.checkPassword(newEntity);
    this.checkFieldsThatIncrementRevokedCount(newEntity);
  }

  checkFieldsThatIncrementRevokedCount(newEntity: T){
    const fieldsThatResetRevokedCount = ['email', 'password'];
    if(fieldsThatResetRevokedCount.some(field => newEntity[field])){
      newEntity.revokedCount = newEntity.revokedCount + 1;
    }
  }

  getUserAgeInWeeks(user: CrudUser){
    return (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 7);
  }

  async addToComputedTrust(user: CrudUser, trust: number, ctx: CrudContext){

    return trust;
  }

  async timeoutUser(user: CrudUser, TIMEOUT_DURATION_MIN: number){
    this.addTimeoutToUser(user, TIMEOUT_DURATION_MIN);
    const patch: any = {timeout: user.timeout, timeoutCount: user.timeoutCount};
    this.unsecure_fastPatchOne(user[this.crudConfig.id_field] , patch, null);
  }

  addTimeoutToUser(user: CrudUser, TIMEOUT_DURATION_MIN: number){
    const duration = TIMEOUT_DURATION_MIN * 60 * 1000 * user.timeoutCount;
    user.timeout = new Date(Date.now() + duration);
    user.timeoutCount = user.timeoutCount || 0;
    user.timeoutCount++;
  }

  async getOrComputeTrust(user: CrudUser, ctx: CrudContext){
    const TRUST_COMPUTE_INTERVAL = 1000 * 60 * 60 * 24;
    if(user.lastComputedTrust && (user.lastComputedTrust.getTime() + TRUST_COMPUTE_INTERVAL) > Date.now()){
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
    this.unsecure_fastPatchOne(user[this.crudConfig.id_field] ,patch, ctx);
    user.trust = trust;
    user.lastComputedTrust = patch.lastComputedTrust;
    this.setCached(user as any, ctx);
    
    return trust;
  }

  verifyTwoFA(user: Loaded<Partial<CrudUser>, never, "*", never>, twoFA_code: any) {
    
    if(user.lastTwoFACode !== twoFA_code){
      throw new UnauthorizedException(CrudErrors.INVALID_CREDENTIALS.str());
    }
    if(user.lastTwoFACodeSent.getTime() + (this.crudConfig.authenticationOptions.TWOFA_EMAIL_TIMEOUT_MIN * 60 * 1000) < Date.now()){
      throw new UnauthorizedException(CrudErrors.TOKEN_EXPIRED.str());
    }

  }

  getVerificationEmailTimeoutHours(user: CrudUser){
    const emailCount = (user.verifiedEmailAttempCount || 0);
    const timeout = emailCount * this.crudConfig.authenticationOptions.VERIFICATION_EMAIL_TIMEOUT_HOURS * 60 * 60 * 1000;
    return { emailCount, timeout};
  }

  getPasswordResetEmailTimeoutHours(user: CrudUser){
    const emailCount = (user.passwordResetAttempCount || 0);
    const timeout = emailCount * this.crudConfig.authenticationOptions.PASSWORD_RESET_EMAIL_TIMEOUT_HOURS * 60 * 60 * 1000;
    return { emailCount, timeout};
  }

  async sendTokenEmail(ctx: CrudContext, lastEmailSentKey, { emailCount, timeout }, tokenKey,  sendEmailFunc, attempCountKey){
    const lastEmailSent = ctx.user[lastEmailSentKey];

    if(emailCount < 2 
      || !lastEmailSent 
      || (lastEmailSent.getTime() + timeout ) >= Date.now()
      ){
      const token = _utils.generateRandomString(16);
      const patch: Partial<CrudUser> = {[tokenKey]: token, [lastEmailSentKey]: new Date(), [attempCountKey]: emailCount+1};
      await this.unsecure_fastPatchOne(ctx.user[this.crudConfig.id_field], patch as any, ctx);
      await sendEmailFunc(ctx.data.email, token);
      return true;
    }

    return new BadRequestException(CrudErrors.EMAIL_ALREADY_SENT.str());
  }

  async useToken(ctx: CrudContext, lastEmailVerificationSentKey, userConditionFunc, tokenKey, userGetTimeoutFunc, callBackFunc ){
    const userId = ctx.data.userId;
    const lastEmailSent = ctx.user[lastEmailVerificationSentKey];
    const user: CrudUser = await this.findOne(userId, ctx) as any;
    if(userConditionFunc(user)){
      return true;
    }
    if(user && user[tokenKey] === ctx.data.token){
      //check if expired
      const { emailCount, timeout } = userGetTimeoutFunc(user);
      if((lastEmailSent && lastEmailSent.getTime() + timeout ) < Date.now()){
          const patch = callBackFunc(user)
          await this.unsecure_fastPatchOne(userId, patch as any, ctx);
          return true;
      }
    }
    return new BadRequestException(CrudErrors.TOKEN_EXPIRED.str());
  }

  async sendVerificationEmail(ctx: CrudContext){
    //Doing this for type checking
    const user: Partial<CrudUser> = { lastEmailVerificationSent: null, emailVerificationToken: null, verifiedEmailAttempCount: 0} 
    const keys = Object.keys(user); 
    return await this.sendTokenEmail(ctx, 
      keys[0], 
      this.getVerificationEmailTimeoutHours(ctx.user), 
      keys[1], 
      this.crudConfig.emailService.sendVerificationEmail, 
      keys[2]);
  }

  async verifyEmail(ctx: CrudContext){
    //Doing this for type checking
    const user: Partial<CrudUser> = { lastEmailVerificationSent: null, emailVerificationToken: null} 
    const keys = Object.keys(user); 
    const res = await this.useToken(ctx, 
      keys[0], 
      (user: CrudUser) => user?.verifiedEmail && !user.nextEmail, 
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
    return { res, accessToken: await this.authService.signTokenForUser(ctx.user)}
  }

  async sendTwoFACode(userId: string, user: CrudUser, ctx: CrudContext){
    const lastTwoFACodeSent = user.lastTwoFACodeSent;
    if(lastTwoFACodeSent && (lastTwoFACodeSent.getTime() + (this.crudConfig.authenticationOptions.TWOFA_EMAIL_TIMEOUT_MIN * 60 * 1000)) > Date.now()){
      return new UnauthorizedException(CrudErrors.EMAIL_ALREADY_SENT.str());
    }
    const code = _utils.generateRandomString(6).toUpperCase();
    const twoFACodeCount = user.twoFACodeCount || 0;
    const patch: Partial<CrudUser> = {lastTwoFACode: code, lastTwoFACodeSent: new Date(), twoFACodeCount: twoFACodeCount+1};
    await this.crudConfig.emailService.sendTwoFactorEmail(user.email, code);
    await this.unsecure_fastPatchOne(userId, patch as any, ctx);
    return true;
  }

  async sendPasswordResetEmail(ctx: CrudContext){
        //Doing this for type checking
        const user: Partial<CrudUser> = { lastPasswordResetSent: null, passwordResetToken: null, passwordResetAttempCount: 0} 
        const keys = Object.keys(user); 
        return await this.sendTokenEmail(ctx, 
          keys[0], 
          this.getPasswordResetEmailTimeoutHours(ctx.user), 
          keys[1], 
          this.crudConfig.emailService.sendPasswordResetEmail, 
          keys[2]);
  }

  async resetPassword(ctx: CrudContext) {
     //Doing this for type checking
    const user: Partial<CrudUser> = { lastPasswordResetSent: null, passwordResetToken: null} 
    const keys = Object.keys(user); 
    const res = await this.useToken(ctx, 
      keys[0], 
      (user: CrudUser) => true, 
      keys[1], 
      this.getPasswordResetEmailTimeoutHours,
       (user: CrudUser) => {
        const patch: Partial<CrudUser> = {password: ctx.data.password, passwordResetAttempCount: 0};
        return patch;
      });
    return { res, accessToken: await this.authService.signTokenForUser(ctx.user)}
  }

  async createAccount(email: string, password: string, ctx: CrudContext){
      if(password?.length > this.crudConfig.authenticationOptions.PASSWORD_MAX_LENGTH){
        throw new BadRequestException(CrudErrors.PASSWORD_TOO_LONG.str());
      }
      const user = new this.userEntityClass();
      user.email = email;
      user.password = password;
      user.role = this.crudConfig.guest_role;

      const res = await this.create(user, ctx);

      return { user: res, accessToken: await this.authService.signTokenForUser(user)}
  }


  override async cmdHandler(cmdName: string, ctx: CrudContext, inheritance?: any) {

    switch (cmdName) {
      case this.baseCmds.sendVerificationEmail.name:
          return await this.sendVerificationEmail(ctx);
      break;

      case this.baseCmds.verifyEmail.name:
          return await this.verifyEmail(ctx);
      break;

      case this.baseCmds.sendPasswordResetEmail.name:
          return await this.sendPasswordResetEmail(ctx);
          break;

      case this.baseCmds.resetPassword.name:
          return await this.resetPassword(ctx);
          break;

      case this.baseCmds.createAccount.name:
          return await this.createAccount(ctx.data.email, ctx.data.password, ctx);
          break;

      default:
        return super.cmdHandler(cmdName, ctx, inheritance);

  }
    
  }


}