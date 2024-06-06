import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  BasicMemoryCache,
  CrudConfigService,
  MicroServicesOptions,
} from '../core/config/crud.config.service';
import { MyUserService } from './myuser.service';
import { MikroORM, EntityManager } from '@mikro-orm/core';
import { MyEmailService } from './myemail.service';
import { CrudRole } from '../core/config/model/CrudRole';
import { MongoDbAdapter } from '../db_mongo/mongoDbAdapter';
import { MyUser } from './entities/MyUser';
import { UserProfile } from './entities/UserProfile';
import { Picture } from './entities/Picture';
import { Melon } from './entities/Melon';
import { FakeEmail } from './entities/FakeEmail';
import { PostgreDbAdapter } from '../db_postgre/postgreDbAdapter';
import { DragonFruit } from './entities/Dragonfruit';

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
    public emailService: MyEmailService,
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
      dbAdapter:
        process.env.TEST_CRUD_DB == 'postgre'
          ? new PostgreDbAdapter()
          : new MongoDbAdapter(),
      microServicesOptions: msOptions,
    });

    this.addRoles(roles);
  }
}
