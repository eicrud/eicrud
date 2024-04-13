import { Injectable } from '@nestjs/common';
import { CrudService } from '../crud/crud.service';
import { CrudSecurity } from '../auth/model/CrudSecurity';
import { CrudContext } from '../auth/auth.utils';
import { _utils } from '../utils';
import { CrudUser } from './entity/CrudUser';


@Injectable()
export class CrudUserService extends CrudService<CrudUser> {
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

  override async create(newEntity: CrudUser, context: CrudContext): Promise<any> {
    await this.checkPassword(newEntity);
    return super.create(newEntity, context);
  }

  override async unsecure_fastCreate(newEntity: CrudUser): Promise<any> {
    await this.checkPassword(newEntity);
    return super.unsecure_fastCreate(newEntity);
  }


  override async patch(entity: CrudUser, newEntity: CrudUser, context: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.patch(entity, newEntity, context);
  }

  override async patchOne(id: string, newEntity: CrudUser, context: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.patchOne(id, newEntity, context);
  }

  override async unsecure_fastPatch(query: CrudUser, newEntity: CrudUser) {
    await this.checkUserBeforePatch(newEntity)
    return super.unsecure_fastPatch(query, newEntity);
  }

  override async unsecure_fastPatchOne(id: string, newEntity: CrudUser) {
      await this.checkPassword(newEntity);
      this.checkFieldsThatResetRevokedCount(newEntity);
      return super.unsecure_fastPatchOne(id, newEntity);
  }

  override async putOne(newEntity: CrudUser, context: CrudContext) {
    await this.checkUserBeforePatch(newEntity)
    return super.putOne(newEntity, context);
  }

  override async unsecure_fastPutOne(newEntity: CrudUser) {
    await this.checkUserBeforePatch(newEntity)
    return super.unsecure_fastPutOne(newEntity);
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

}