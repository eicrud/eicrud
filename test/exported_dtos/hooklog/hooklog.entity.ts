import { CrudEntity } from '@eicrud/core/crud';

export type HookPos = 'before' | 'after' | 'error';
export type HookType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'crud'
  | 'controller'
  | 'backdoor';

export class HookLog implements CrudEntity {
  id?: string;

  message: string;

  hookPosition: HookPos;

  length: number;

  backDoorQuery: any;

  hookType: HookType;

  createdAt: Date;

  updatedAt: Date;
}
