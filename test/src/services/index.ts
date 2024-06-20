import DragonFruit from './dragonfruit/dragonfruit.entity';
import { DragonFruitService } from './dragonfruit/dragonfruit.service';
import FakeEmail from './fakeemail/fakeemail.entity';
import { FakeEmailService } from './fakeemail/fakeemail.service';
import Melon from './melon/melon.entity';
import { MelonService } from './melon/melon.service';
import Picture from './picture/picture.entity';
import { PictureService } from './picture/picture.service';
import UserProfile from './userprofile/userprofile.entity';
import { UserProfileService } from './userprofile/userprofile.service';
import MyUser from './myuser/myuser.entity';
import { MyUserService } from './myuser/myuser.service';

//Auto generated file

export const CRUDServices = [
  DragonFruitService,
  FakeEmailService,
  MelonService,
  PictureService,
  UserProfileService,
  MyUserService,
];

export const CRUDEntities = [
  DragonFruit,
  FakeEmail,
  Melon,
  Picture,
  UserProfile,
  MyUser,
];
