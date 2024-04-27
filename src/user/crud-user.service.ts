import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudService } from '../crud/crud.service';
import { CrudSecurity } from '../crud/model/CrudSecurity';
import { _utils } from '../utils';
import { CrudUser } from './entity/CrudUser';
import { CrudContext } from '../auth/model/CrudContext';
import { CrudConfigService } from '../crud/crud.config.service';
import { CrudAuthorizationService } from '../crud/crud.authorization.service';


@Injectable()
export class CrudUserService extends CrudService<CrudUser> {


  constructor(@Inject(forwardRef(() => CrudConfigService))
  protected crudConfig: CrudConfigService,
  protected authorizationService: CrudAuthorizationService,
  ) {
    super(crudConfig);
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
    return super.patch(entity, newEntity, context);
  }

  override async patchOne(id: string, newEntity: CrudUser, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.patchOne(id, newEntity, ctx);
  }

  override async unsecure_fastPatch(query: CrudUser, newEntity: CrudUser, ctx: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.unsecure_fastPatch(query, newEntity, ctx);
  }

  override async unsecure_fastPatchOne(id: string, newEntity: Partial<CrudUser>, ctx: CrudContext) {
      await this.checkPassword(newEntity);
      this.checkFieldsThatResetRevokedCount(newEntity);
      return super.unsecure_fastPatchOne(id, newEntity);
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
    this.checkFieldsThatResetRevokedCount(newEntity);
  }

  checkFieldsThatResetRevokedCount(newEntity: CrudUser){
    const fieldsThatResetRevokedCount = ['email', 'password'];
    if(fieldsThatResetRevokedCount.some(field => newEntity[field])){
      newEntity.revokedCount = 0;
    }
  }

  getUserAgeInWeeks(user: CrudUser){
    return (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 7);
  }

  async addToComputedTrust(user: CrudUser, trust: number, ctx: CrudContext){

    return trust;
  }

  async timeoutUser(user: Partial<CrudUser>, TIMEOUT_DURATION_MIN: number){
    this.addTimeoutToUser(user, TIMEOUT_DURATION_MIN);
    const patch = {timeout: user.timeout, timeoutCount: user.timeoutCount};
    this.unsecure_fastPatchOne(user[this.crudConfig.id_field] ,patch, null);
  }


  addTimeoutToUser(user: Partial<CrudUser>, TIMEOUT_DURATION_MIN: number){
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

    trust = await this.addToComputedTrust(user, trust, ctx);
    const patch = {trust, lastComputedTrust: new Date()};
    this.unsecure_fastPatchOne(user[this.crudConfig.id_field] ,patch, ctx);
    user.trust = trust;
    user.lastComputedTrust = patch.lastComputedTrust;
    this.setCached(user, ctx);
    
    return trust;
  }


}