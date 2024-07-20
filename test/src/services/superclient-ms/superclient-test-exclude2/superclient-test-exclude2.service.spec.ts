import { MongoDriver } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { SuperclientTestExclude2Service } from './superclient-test-exclude2.service';
import { EICRUDModule } from '@eicrud/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SuperclientTestExclude2 } from './superclient-test-exclude2.entity';
import { MyConfigService } from '../../../eicrud.config.service';
import { CRUD_CONFIG_KEY } from '@eicrud/core/config';

describe('AppController', () => {
  let myService: SuperclientTestExclude2Service;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          entities: [SuperclientTestExclude2],
          driver: MongoDriver,
          dbName: 'test-superclient-test-exclude2',
        }),
        EICRUDModule.forRoot(),
      ],
      providers: [
        SuperclientTestExclude2Service,
        {
          provide: CRUD_CONFIG_KEY,
          useClass: MyConfigService,
        },
      ],
    }).compile();

    myService = app.get<SuperclientTestExclude2Service>(
      SuperclientTestExclude2Service,
    );
  });

  describe('root', () => {
    it('should be defined"', () => {
      expect(myService).toBeDefined();
    });
  });
});
