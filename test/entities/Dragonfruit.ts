import {
  PrimaryKey,
  OneToOne,
  Property,
  ManyToOne,
  Entity,
  Embeddable,
  Embedded,
} from '@mikro-orm/core';
import {
  Allow,
  IsDate,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CrudEntity } from '@eicrud/core/crud/model/CrudEntity';
import { MyUser } from './MyUser';

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
