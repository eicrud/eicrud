import { CrudEntity } from '@eicrud/core/crud';

export class FakeEmail implements CrudEntity {
  id: string;

  to: string;

  message: string;

  type: string;

  createdAt: Date;

  updatedAt: Date;
}
