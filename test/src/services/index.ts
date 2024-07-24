import {
  superclientCRUDServices,
  superclientCRUDEntities,
} from './superclient-ms/index';
import { HookTrigger } from './hook-trigger/hook-trigger.entity';
import { HookTriggerService } from './hook-trigger/hook-trigger.service';
import { HookLog } from './hook-log/hook-log.entity';
import { HookLogService } from './hook-log/hook-log.service';
import { DragonFruit } from './dragon-fruit/dragon-fruit.entity';
import { DragonFruitService } from './dragon-fruit/dragon-fruit.service';
import { FakeEmail } from './fake-email/fake-email.entity';
import { FakeEmailService } from './fake-email/fake-email.service';
import { Melon } from './melon/melon.entity';
import { MelonService } from './melon/melon.service';
import { Picture } from './picture/picture.entity';
import { PictureService } from './picture/picture.service';
import { UserProfile } from './user-profile/user-profile.entity';
import { UserProfileService } from './user-profile/user-profile.service';
import { MyUser } from './my-user/my-user.entity';
import { MyUserService } from './my-user/my-user.service';

//Auto generated file

export const CRUDServices = [
  ...superclientCRUDServices,
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
  ...superclientCRUDEntities,
  HookTrigger,
  HookLog,
  DragonFruit,
  FakeEmail,
  Melon,
  Picture,
  UserProfile,
  MyUser,
];
