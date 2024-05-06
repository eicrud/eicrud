import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';
import { MyUserService } from '../myuser.service';

const testAdminCreds = {
  email: "admin@testmail.com",
  password: "testpassword"
}

describe('AppController', () => {
  let appController: CrudController;
  let userService: MyUserService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule(
      getModule('basic-test-db')
    ).compile();

    appController = app.get<CrudController>(CrudController);
    userService = app.get<MyUserService>(MyUserService);

    userService.createAccount(testAdminCreds.email,testAdminCreds.password, null, "super_admin" )
  });

  describe('root', () => {
    it('should be defined"', () => {
      expect(appController).toBeDefined();
    });


    
  });
});
