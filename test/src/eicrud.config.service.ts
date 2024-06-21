import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  BasicMemoryCache,
  CrudConfigService,
  MicroServicesOptions,
} from '@eicrud/core/config/crud.config.service';
import { MikroORM, EntityManager } from '@mikro-orm/core';
import { CrudRole } from '@eicrud/core/config/model/CrudRole';
import { MongoDbAdapter } from '@eicrud/mongodb/mongoDbAdapter';

import { PostgreDbAdapter } from '@eicrud/postgresql/postgreDbAdapter';
import UserProfile from './services/userprofile/userprofile.entity';
import Picture from './services/picture/picture.entity';
import MyUser from './services/myuser/myuser.entity';
import Melon from './services/melon/melon.entity';
import DragonFruit from './services/dragonfruit/dragonfruit.entity';
import FakeEmail from './services/fakeemail/fakeemail.entity';
import { MyUserService } from './services/myuser/myuser.service';
import { FakeEmailService } from './services/fakeemail/fakeemail.service';
import { CrudContext, CrudService } from '@eicrud/core/crud';
import { HookLogService } from './services/hooklog/hooklog.service';
import { logHook } from './services/hooktrigger/hooktrigger.hooks';
import { HookTriggerService } from './services/hooktrigger/hooktrigger.service';
import { UserProfileService } from './services/userprofile/userprofile.service';

const roles: CrudRole[] = [
  {
    name: 'super_admin',
    isAdminRole: true,
    canMock: true,
    inherits: ['admin'],
  },
  {
    name: 'admin',
    isAdminRole: true,
    canMock: true,
    inherits: ['trusted_user'],
  },
  {
    name: 'moderator',
    inherits: ['trusted_user'],
  },
  {
    name: 'trusted_user',
    inherits: ['user'],
  },
  {
    name: 'user',
    inherits: ['guest'],
  },
  { name: 'guest' },
];

const msOptions = new MicroServicesOptions();

msOptions.username = 'backDoorUser';
msOptions.password = 'zMaXZAAQlqfZWkvm4545za';

const PROXY_TEST = process.env.TEST_CRUD_PROXY;

msOptions.microServices = {
  entry: {
    services: PROXY_TEST ? [UserProfile, Picture] : [],
    openBackDoor: PROXY_TEST ? true : false,
    openController: true,
    url: 'http://localhost:3004',
    proxyCrudController: PROXY_TEST ? true : false,
  },
  user: {
    services: [MyUser],
    openBackDoor: true,
    openController: PROXY_TEST ? true : false,
    url: 'http://localhost:3005',
  },
  melon: {
    services: PROXY_TEST
      ? [Melon, DragonFruit]
      : [Melon, DragonFruit, UserProfile, Picture],
    openBackDoor: true,
    openController: PROXY_TEST ? true : false,
    url: 'http://localhost:3006',
  },
  email: {
    services: [FakeEmail],
    openBackDoor: true,
    openController: PROXY_TEST ? true : false,
    url: 'http://localhost:3007',
  },
};

@Injectable()
export class MyConfigService extends CrudConfigService {
  constructor(
    public userService: MyUserService,
    public entityManager: EntityManager,
    public emailService: FakeEmailService,
    public hookTriggerService: HookTriggerService,
    protected orm: MikroORM,
  ) {
    super({
      userService,
      entityManager,
      emailService,
      jwtSecret: 'myTestSecret',
      cacheManager: new BasicMemoryCache(),
      orm,
      id_field: 'id',
      captchaService: true,
      watchTrafficOptions: {
        userTrafficProtection: PROXY_TEST ? false : true,
        ddosProtection: PROXY_TEST ? false : true,
        useForwardedIp: PROXY_TEST ? true : false,
      },
      authenticationOptions: {
        renewJwt: true,
      },
      dbAdapter:
        process.env.TEST_CRUD_DB == 'postgre'
          ? new PostgreDbAdapter()
          : new MongoDbAdapter(),
      microServicesOptions: msOptions,
    });

    this.addRoles(roles);
  }

  override async beforeControllerHook(ctx: CrudContext) {
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'before',
      'controller',
      ctx,
    );
  }

  override async afterControllerHook(res: any, ctx: CrudContext) {
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'after',
      'controller',
      ctx,
    );
  }

  override async errorControllerHook(error: Error, ctx: CrudContext) {
    const profileService: CrudService<UserProfile> =
      this.servicesMap['user-profile'];
    if (!profileService) {
      throw new Error('UserProfile service not found (errorControllerHook)');
    }
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'error',
      'controller',
      ctx,
    );
  }

  override async afterBackdoorHook(res: any, ctx: CrudContext) {
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'after',
      'backdoor',
      ctx,
    );
  }

  override async beforeBackdoorHook(ctx: CrudContext) {
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'before',
      'backdoor',
      ctx,
    );
  }

  override async errorBackdoorHook(error: Error, ctx: CrudContext) {
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'error',
      'backdoor',
      ctx,
    );
  }
}
