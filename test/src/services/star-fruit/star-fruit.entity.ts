import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { IsString, IsOptional } from 'class-validator'; //this is a test, no semi-colon here
import { CrudEntity } from '@eicrud/core/crud';

@Entity()
export class StarFruit implements CrudEntity {
  @PrimaryKey({ name: '_id' })
  @IsString()
  @IsOptional()
  id: string;

  @Property()
  @IsString()
  ownerEmail: string;

  @Property()
  @IsString()
  name: string;

  @Property()
  @IsOptional()
  @IsString()
  quality: string = 'good';

  @Property()
  @IsOptional()
  @IsString()
  key: string = 'unknown';

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;
}
