import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { IsString, IsOptional } from 'class-validator';
import { CrudEntity } from '@eicrud/core/crud';

@Entity()
export class HookTrigger implements CrudEntity {
  @PrimaryKey({ name: '_id' })
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @Property()
  message: string;

  @Property()
  originalMessage: string;

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;
}
