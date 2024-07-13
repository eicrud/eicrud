import { CrudEntity } from '@eicrud/core/crud';
import { MyUser } from '../myuser/myuser.entity';

export class DragonFruit implements CrudEntity {
  id: string;

  @ManyToOne(() => MyUser)
  owner: MyUser | string;

  ownerEmail: string;

  size: number = 1;

  name: string;

  secretCode: string;

  createdAt: Date;

  updatedAt: Date;
}
