import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { IsString, IsOptional, IsInt } from 'class-validator';
import { CrudEntity } from '@eicrud/core/crud';
import MyUser from '../myuser/myuser.entity';

@Entity()
export class DragonFruit implements CrudEntity {
  @PrimaryKey({ name: '_id' })
  @IsString()
  @IsOptional()
  id: string;

  @ManyToOne(() => MyUser)
  @IsString()
  owner: MyUser | string;

  @Property()
  @IsString()
  ownerEmail: string;

  @Property()
  @IsInt()
  @IsOptional()
  size: number = 1;

  @Property()
  @IsString()
  name: string;

  @Property()
  @IsString()
  secretCode: string;

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;
}
