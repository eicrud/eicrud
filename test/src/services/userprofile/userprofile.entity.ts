import {
  Property,
  PrimaryKey,
  OneToOne,
  Entity,
  Embeddable,
  Embedded,
  Unique,
  Collection,
  OneToMany,
} from '@mikro-orm/core';
import {
  Allow,
  Equals,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import MyUser from '../myuser/myuser.entity';
import {
  $ToLowerCase,
  $Trim,
  $Transform,
  $Type,
  $Delete,
  $MaxSize,
} from '@eicrud/core/validation';
import { CrudEntity } from '@eicrud/core/crud';
import { Picture } from '../picture/picture.entity';

@Embeddable()
export class Geoloc {
  @Property({ nullable: true })
  @IsString()
  @IsOptional()
  @$ToLowerCase()
  @$Trim()
  street: string;

  @Property()
  @IsString()
  city: string;

  @Property({ nullable: true })
  @IsNumber()
  @IsOptional()
  zip: number;
}

@Entity()
export default class UserProfile implements CrudEntity {
  @PrimaryKey({ name: '_id' })
  @IsString()
  @IsOptional()
  id: string;

  @OneToOne(() => MyUser, (user) => user.profile, { owner: true })
  @IsString()
  user: MyUser | string;

  @OneToMany(() => Picture, (mel) => mel.profile)
  @$MaxSize(200)
  @Allow()
  pictures = new Collection<Picture>(this);

  @Unique()
  @Property()
  @IsString()
  @MaxLength(30)
  userName: string;

  @Property()
  @IsString()
  @IsOptional()
  type: 'basic' | 'admin' = 'basic';

  @Property({ nullable: true })
  @IsString()
  @IsOptional()
  forbiddenField: string;

  @Property({ nullable: true })
  @IsString()
  @IsOptional()
  @$MaxSize(300)
  bio: string;

  @Property({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  astroSign: string;

  @Property({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  chineseSign: string;

  @Property({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  favoritePlanet: string;

  @Property()
  @IsString()
  @IsOptional()
  favoriteColor: string = 'blue';

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;

  @Property({ nullable: true })
  @IsString()
  @$ToLowerCase()
  @$Trim()
  @IsOptional()
  lowercaseTrimmedField: string;

  @Property({ nullable: true })
  @IsString()
  @IsOptional()
  @$Transform((value: string) => value.toUpperCase())
  upperCaseField: string;

  @Embedded(() => Geoloc, { nullable: true })
  @IsOptional()
  @$Type(Geoloc)
  @ValidateNested()
  geoloc: Geoloc;

  @Property({ nullable: true })
  @$Delete()
  fieldToDelete: string;
}
