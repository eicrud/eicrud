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
import { UserProfile } from './services/user-profile/user-profile.entity';
import { Picture } from './services/picture/picture.entity';
import { MyUser } from './services/my-user/my-user.entity';
import { Melon } from './services/melon/melon.entity';
import { DragonFruit } from './services/dragon-fruit/dragon-fruit.entity';
import { FakeEmail } from './services/fake-email/fake-email.entity';
import { MyUserService } from './services/my-user/my-user.service';
import { FakeEmailService } from './services/fake-email/fake-email.service';
import { MsLinkQuery, CrudContext, CrudService } from '@eicrud/core/crud';
import { HookLogService } from './services/hook-log/hook-log.service';
import { logHook } from './services/hook-trigger/hook-trigger.hooks';
import { HookTriggerService } from './services/hook-trigger/hook-trigger.service';
import { UserProfileService } from './services/user-profile/user-profile.service';
import { HookTrigger } from './services/hook-trigger/hook-trigger.entity';
import { HookLog } from './services/hook-log/hook-log.entity';
import { SuperclientTest } from './services/superclient-ms/superclient-test/superclient-test.entity';
import { SuperclientTestExclude } from './services/superclient-ms/superclient-test-exclude/superclient-test-exclude.entity';
import { SuperclientTestExclude2 } from './services/superclient-ms/superclient-test-exclude2/superclient-test-exclude2.entity';

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

msOptions.username = 'MsLinkUser';
msOptions.password = 'zMaXZAAQlqfZWkvm4545za';

const PROXY_TEST = process.env.TEST_CRUD_PROXY;

msOptions.microServices = {
  entry: {
    services: PROXY_TEST ? [UserProfile, Picture] : [],
    openMsLink: PROXY_TEST ? true : false,
    openController: true,
    url: 'http://localhost:3004',
    proxyCrudController: PROXY_TEST ? true : false,
  },
  user: {
    services: [
      MyUser,
      HookTrigger,
      SuperclientTest,
      SuperclientTestExclude,
      SuperclientTestExclude2,
    ],
    openMsLink: true,
    openController: PROXY_TEST ? true : false,
    url: 'http://localhost:3005',
  },
  melon: {
    services: PROXY_TEST
      ? [Melon, DragonFruit]
      : [Melon, DragonFruit, UserProfile, Picture],
    openMsLink: true,
    openController: PROXY_TEST ? true : false,
    url: 'http://localhost:3006',
  },
  email: {
    services: [FakeEmail, HookLog],
    openMsLink: true,
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
    if (ctx.serviceName != 'hook-trigger') {
      return;
    }
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'before',
      'controller',
      ctx,
    );
  }

  override async afterControllerHook(res: any, ctx: CrudContext) {
    if (ctx.serviceName != 'hook-trigger') {
      return;
    }
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
    if (ctx.serviceName != 'hook-trigger') {
      return;
    }
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'error',
      'controller',
      ctx,
    );
  }

  override async afterMsLinkHook(
    res: any,
    ctx: CrudContext,
    query: MsLinkQuery,
    args: any[],
  ) {
    if (query.service != 'hook-trigger' || (ctx as any).skipMsLinkHooks) {
      return;
    }
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'after',
      'ms-link',
      ctx,
      query,
      args,
    );
  }

  override async beforeMsLinkHook(
    ctx: CrudContext,
    query: MsLinkQuery,
    args: any[],
  ) {
    if (query.service != 'hook-trigger' || (ctx as any).skipMsLinkHooks) {
      return;
    }
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'before',
      'ms-link',
      ctx,
      query,
      args,
    );
  }

  override async errorMsLinkHook(
    error: Error,
    ctx: CrudContext,
    query: MsLinkQuery,
    args: any[],
  ) {
    if (query.service != 'hook-trigger' || (ctx as any).skipMsLinkHooks) {
      return;
    }
    await logHook(
      this.hookTriggerService,
      ctx.data || ctx.query,
      'error',
      'ms-link',
      ctx,
      query,
      args,
    );
  }
}
