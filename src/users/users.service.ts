import { Injectable } from '@nestjs/common';
import { CrudService } from '../crud/crud.service';
import { CrudSecurity } from '../auth/model/CrudSecurity';
import { CrudContext } from '../auth/auth.utils';
import { _utils } from '../utils';

// This should be a real class/interface representing a user entity
export interface User{
  _id: string;
  email: string;
  password: string;
  lastLoginAttempt: Date;
  failedLoginCount: number;
  security: CrudSecurity;
  createdAt: Date;
  updatedAt: Date;
  revokedCount: number;
};
@Injectable()
export class UsersService extends CrudService<User> {
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

  override async create(newEntity: User, context: CrudContext): Promise<any> {
    await this.checkPassword(newEntity);
    return super.create(newEntity, context);
  }

  override async unsecure_fastUpdate(query: User, newEntity: User) {
    await this.checkPassword(newEntity);
    return super.unsecure_fastUpdate(query, newEntity);
  }

  // UNSECURE : no user imput
  override async unsecure_fastUpdateOne(id: string, newEntity: User) {
    await this.checkPassword(newEntity);
    return super.unsecure_fastUpdateOne(id, newEntity);
  }

  override async safe_updateEntity(entity: User, newEntity: User, context: CrudContext) {
    await this.checkPassword(newEntity);
    return super.safe_updateEntity(entity, newEntity, context);
  }

  async checkPassword(newEntity: User) {
    if(newEntity.password){
      newEntity.password = await _utils.hashPassword(newEntity.password);
    }
  }

  async checkFieldsThatResetRevokedCount(newEntity: User){
    const fieldsThatResetRevokedCount = ['email', 'password'];
    if(fieldsThatResetRevokedCount.some(field => newEntity[field])){
      newEntity.revokedCount = 0;
    }

  }


}