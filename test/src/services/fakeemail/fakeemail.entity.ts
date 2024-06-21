import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { IsString, IsOptional } from 'class-validator';
import { CrudEntity } from '@eicrud/core/crud';

@Entity()
export default class FakeEmail implements CrudEntity {
  @PrimaryKey({ name: '_id' })
  id: string;

  @Property()
  to: string;

  @Property()
  message: string;

  @Property()
  type: string;

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;
}
