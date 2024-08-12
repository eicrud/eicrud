import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { IsString, IsOptional } from 'class-validator';
import { CrudEntity } from '@eicrud/core/crud';

export type HookPos = 'before' | 'after' | 'error';
export type HookType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'crud'
  | 'controller'
  | 'cmd'
  | 'ms-link';

@Entity()
export class HookLog implements CrudEntity {
  @PrimaryKey({ name: '_id' })
  @IsString()
  @IsOptional()
  id?: string;

  @Property()
  message: string;

  @Property()
  hookPosition: HookPos;

  @Property()
  length: number;

  @Property({ nullable: true })
  MsLinkQuery: any;

  @Property()
  hookType: HookType;

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;
}
