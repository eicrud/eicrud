import { CrudEntity } from '@eicrud/core/crud';

export class HookTrigger implements CrudEntity {
  id: any;

  message: string;

  originalMessage: string;

  createdAt: Date;

  updatedAt: Date;
}
