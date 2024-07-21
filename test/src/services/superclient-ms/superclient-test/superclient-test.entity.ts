import { Entity, PrimaryKey, Property, Embedded } from '@mikro-orm/core';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { CrudEntity } from '@eicrud/core/crud';
import { SharedEmbeddable } from '../shared-dto';
import { $Type } from '@eicrud/core/validation';

@Entity()
export class SuperclientTest implements CrudEntity {
  @PrimaryKey({ name: '_id' })
  @IsString()
  @IsOptional()
  id: string;

  @Property()
  createdAt: Date;

  @Embedded(() => SharedEmbeddable, { nullable: true })
  @$Type(SharedEmbeddable)
  @IsOptional()
  @ValidateNested()
  testEmbedded: SharedEmbeddable;

  @Property()
  //@eicrud:cli:export:delete:next-line
  updatedAt: Date;
}
