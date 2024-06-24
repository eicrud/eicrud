import { HookTrigger } from './hooktrigger/hooktrigger.entity';
import { HookTriggerService } from './hooktrigger/hooktrigger.service';
import { HookLog } from './hooklog/hooklog.entity';
import { HookLogService } from './hooklog/hooklog.service';
import { DragonFruit } from './dragonfruit/dragonfruit.entity';
import { DragonFruitService } from './dragonfruit/dragonfruit.service';
import { FakeEmail } from './fakeemail/fakeemail.entity';
import { FakeEmailService } from './fakeemail/fakeemail.service';
import { Melon } from './melon/melon.entity';
import { MelonService } from './melon/melon.service';
import { Picture } from './picture/picture.entity';
import { PictureService } from './picture/picture.service';
import { UserProfile } from './userprofile/userprofile.entity';
import { UserProfileService } from './userprofile/userprofile.service';
import { MyUser } from './myuser/myuser.entity';
import { MyUserService } from './myuser/myuser.service';

//Auto generated file

export const CRUDServices = [
  HookTriggerService,
  HookLogService,
  DragonFruitService,
  FakeEmailService,
  MelonService,
  PictureService,
  UserProfileService,
  MyUserService,
];

export const CRUDEntities = [
  HookTrigger,
  HookLog,
  DragonFruit,
  FakeEmail,
  Melon,
  Picture,
  UserProfile,
  MyUser,
];
