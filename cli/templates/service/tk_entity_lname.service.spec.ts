import { Test, TestingModule } from '@nestjs/testing';
import { tk_entity_nameService } from './tk_entity_lname.service';
import { EICRUDModule } from '@eicrud/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import tk_entity_name from './tk_entity_lname.entity';
import { MyConfigService } from '../../eicrud.config.service';
import { CRUD_CONFIG_KEY } from '@eicrud/core/config';

describe('AppController', () => {
  let myService: tk_entity_nameService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          entities: [tk_entity_name],
          driver: tk_orm_driver,
          dbName: 'test-tk_entity_lname',
        }),
        EICRUDModule.forRoot(),
      ],
      providers: [
        tk_entity_nameService,
        {
          provide: CRUD_CONFIG_KEY,
          useClass: MyConfigService,
        },
      ],
    }).compile();

    myService = app.get<tk_entity_nameService>(tk_entity_nameService);
  });

  describe('root', () => {
    it('should be defined"', () => {
      expect(myService).toBeDefined();
    });
  });
});
