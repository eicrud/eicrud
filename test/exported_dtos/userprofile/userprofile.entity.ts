import { MyUser } from '../myuser/myuser.entity';
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

export class Geoloc {
  @$ToLowerCase()
  @$Trim()
  street: string;

  city: string;

  zip: number;
}

export class UserProfile implements CrudEntity {
  id: string;

  @OneToOne(() => MyUser, (user) => user.profile, { owner: true })
  user: MyUser | string;

  @OneToMany(() => Picture, (mel) => mel.profile)
  @$MaxSize(200)
  pictures = new Collection<Picture>(this);

  userName: string;

  type: 'basic' | 'admin' = 'basic';

  forbiddenField: string;

  @$MaxSize(300)
  bio: string;

  astroSign: string;

  chineseSign: string;

  favoritePlanet: string;

  favoriteColor: string = 'blue';

  createdAt: Date;

  updatedAt: Date;

  @$ToLowerCase()
  @$Trim()
  lowercaseTrimmedField: string;

  @$Transform((value: string) => value.toUpperCase())
  upperCaseField: string;

  @Embedded(() => Geoloc, { nullable: true })
  @$Type(Geoloc)
  geoloc: Geoloc;

  @$Delete()
  fieldToDelete: string;
}
