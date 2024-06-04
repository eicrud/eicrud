import { Property, PrimaryKey, Entity, ManyToOne } from '@mikro-orm/core';
import { CrudEntity } from '../../core/crud/model/CrudEntity';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

import { UserProfile } from './UserProfile';

@Entity()
export class Picture implements CrudEntity {
  @PrimaryKey({ name: '_id' })
  @IsString()
  @IsOptional()
  id: string;

  @ManyToOne(() => UserProfile)
  @IsString()
  profile: UserProfile | string;

  @Property()
  @IsNumber()
  width: number;

  @Property()
  @IsNumber()
  height: number;

  @Property({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  alt: string;

  @Property()
  @IsString()
  src: string;

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;
}
