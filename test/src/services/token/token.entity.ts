import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { IsString, IsOptional } from 'class-validator';
import { CrudEntity } from '@eicrud/core/crud';
import { CrudToken } from '@eicrud/core/authentication';
import { MyUser } from '../my-user/my-user.entity';

@Entity()
export class Token implements CrudToken {
  @PrimaryKey({ name: '_id' })
  @IsString()
  @IsOptional()
  id: string;

  @Unique()
  @Property()
  token: string; //A secure API key

  @Property({ nullable: true })
  expiresAt?: Date; //Invalid after this date

  @ManyToOne(() => MyUser)
  user: MyUser | string;

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;
}
