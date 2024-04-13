import { Test, TestingModule } from '@nestjs/testing';
import { CrudUserService } from './crud-user.service';

describe('UsersService', () => {
  let service: CrudUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrudUserService],
    }).compile();

    service = module.get<CrudUserService>(CrudUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
