import { Test, TestingModule } from '@nestjs/testing';

import { getModule } from '../test.module';
import { CrudController } from '../../crud/crud.controller';

describe('AppController', () => {
  let appController: CrudController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule(
      getModule('basic-test-db')
    ).compile();

    appController = app.get<CrudController>(CrudController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController).toBeDefined();
    });
  });
});
