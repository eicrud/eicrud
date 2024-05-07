import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';
import { MyUserService } from '../myuser.service';
import { CrudAuthService } from '../../authentification/auth.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { EntityManager } from '@mikro-orm/mongodb';

const testAdminCreds = {
  email: "admin@testmail.com",
  password: "testpassword"
}

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;
  let authService: CrudAuthService;
  let jwt: string;
  let app: NestFastifyApplication;
  let userId: string;


  beforeAll(async () => {

    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule('basic-test-db')
    ).compile();
    moduleRef.get<EntityManager>(EntityManager).getConnection().getDb().dropDatabase();
    
  });

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule(
      getModule('basic-test-db')
    ).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);
    authService = app.get<CrudAuthService>(CrudAuthService);

    const accRes = await userService.createAccount(testAdminCreds.email,testAdminCreds.password, null, "super_admin" );
    jwt = accRes.accessToken;
    userId = accRes.userId?.toString();

  });

  it('should get auth', () => {
    return app
    .inject({
      method: 'GET',
      url: '/crud/auth',
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    })
    .then((result) => {
      expect(result.statusCode).toEqual(200);
      expect(result.json().userId).toEqual(userId);
    });
  });
});
