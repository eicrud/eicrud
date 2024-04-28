import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudService } from '../crud/crud.service';
import { CrudSecurity } from '../crud/model/CrudSecurity';
import { _utils } from '../utils';
import { CrudUser } from './model/CrudUser';
import { CrudContext } from '../crud/model/CrudContext';
import { CrudConfigService } from '../crud/crud.config.service';
import { CrudAuthorizationService } from '../crud/crud.authorization.service';
import { Type } from '@mikro-orm/core';
import { CrudErrors } from '../crud/model/CrudErrors';


@Injectable()
export class CrudUserService extends CrudService<CrudUser> {


  constructor(@Inject(forwardRef(() => CrudConfigService))
  protected crudConfig: CrudConfigService,
  protected authorizationService: CrudAuthorizationService,
  ) {
    super(crudConfig, Type<CrudUser>, new CrudSecurity());
  }

  private readonly users = [
    {
      userId: "1",
      email: 'john',
      password: 'changeme',
    },
    {
      userId: "2",
      email: 'maria',
      password: 'guess',
    },
  ];

  override async create(newEntity: CrudUser, ctx: CrudContext): Promise<any> {
    
    await this.checkPassword(newEntity);
    return super.create(newEntity, ctx);
  }

  override async unsecure_fastCreate(newEntity: CrudUser, ctx: CrudContext): Promise<any> {
    await this.checkPassword(newEntity);
    return super.unsecure_fastCreate(newEntity, ctx);
  }


  override async patch(entity: CrudUser, newEntity: CrudUser, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.patch(entity, newEntity, ctx);
  }

  override async patchOne(id: string, newEntity: CrudUser, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.patchOne(id, newEntity, ctx);
  }

  override async unsecure_fastPatch(query: CrudUser, newEntity: CrudUser, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.unsecure_fastPatch(query, newEntity, ctx);
  }

  override async unsecure_fastPatchOne(id: string, newEntity: CrudUser, ctx: CrudContext) {
      await this.checkPassword(newEntity);
      this.checkFieldsThatIncrementRevokedCount(newEntity);
      return super.unsecure_fastPatchOne(id, newEntity, ctx);
  }

  override async putOne(newEntity: CrudUser, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.putOne(newEntity, ctx);
  }

  override async unsecure_fastPutOne(newEntity: CrudUser, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.unsecure_fastPutOne(newEntity, ctx);
  }

  async checkPassword(newEntity: CrudUser) {
    if(newEntity.password){
      newEntity.password = await _utils.hashPassword(newEntity.password);
    }
  }

  async checkUserBeforePatch(newEntity: CrudUser){
    await this.checkPassword(newEntity);
    this.checkFieldsThatIncrementRevokedCount(newEntity);
  }

  checkFieldsThatIncrementRevokedCount(newEntity: CrudUser){
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
    this.setCached(user, ctx);
    
    return trust;
  }

  VERIFICATION_EMAIL_TIMEOUT_HOURS = 6;

  getVerificationEmailTimeoutHours(user: CrudUser){
    const emailCount = user.verifiedEmailCount;
    const timeout = emailCount * this.VERIFICATION_EMAIL_TIMEOUT_HOURS * 60 * 60 * 1000;
    return { emailCount, timeout};
  }


  override async cmdHandler(cmdName: string, ctx: CrudContext, inheritance?: any) {
    switch (cmdName) {
      case 'sendVerificationEmail':
          const lastEmailSent = ctx.user.lastVerificationSent;
          const { emailCount, timeout } = this.getVerificationEmailTimeoutHours(ctx.user);

          if(emailCount < 2 
            || !lastEmailSent 
            || (lastEmailSent.getTime() + timeout ) >= Date.now()
            ){
            const token = _utils.generateRandomString(16);
            const patch: any = {lastVerificationToken: token, lastVerificationSent: new Date(), verifiedEmailCount: emailCount+1};
            await this.unsecure_fastPatchOne(ctx.user[this.crudConfig.id_field], patch, ctx);
            await this.crudConfig.emailService.sendVerificationEmail(ctx.data.email, token);
            return true;
          }

          return new BadRequestException(CrudErrors.EMAIL_ALREADY_SENT.str());
      break;

      case 'verifyEmail':
          const userId = ctx.data.userId;
          const user: CrudUser = await this.findOne(userId, ctx) as any;
          if(user?.verifiedEmail && !user?.nextEmail){
            return true;
          }
          if(user && user.lastVerificationToken === ctx.data.token){
            //check if expired
            const { emailCount, timeout } = this.getVerificationEmailTimeoutHours(user);
            if((lastEmailSent && lastEmailSent.getTime() + timeout ) < Date.now()){
                const patch: any = {verifiedEmail: true, verifiedEmailCount: 0};
                if(user.nextEmail){
                  patch.email = user.nextEmail;
                  patch.nextEmail = null;
                }
                await this.unsecure_fastPatchOne(userId, patch, ctx);
                return true;
            }
          }
          return new BadRequestException(CrudErrors.TOKEN_EXPIRED.str());
      break;


      case 'sendTwoFACode':
          break;

      case 'sendPasswordResetEmail':
          break;

      case 'resetPassword':
          break;

      default:
        return super.cmdHandler(cmdName, ctx, inheritance);

  }
    
  }
  


}