import { BaseEntity, Entity, EntityClass } from '@mikro-orm/core';

export interface CrudEntity extends Partial<BaseEntity> {
  createdAt: Date;
  updatedAt: Date;
}
