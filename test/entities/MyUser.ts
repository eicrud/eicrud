import {
  Collection,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { CrudUser } from '../../core/config/model/CrudUser';
import {
  Equals,
  IsBoolean,
  IsDate,
  IsEmail,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserProfile } from './UserProfile';
import { Melon } from './Melon';

@Entity()
export class MyUser implements CrudUser {}
