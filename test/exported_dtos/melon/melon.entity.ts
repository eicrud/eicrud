import { CrudEntity } from '@eicrud/core/crud';
import {
  $MaxSize,
  $Type,
  $Transform,
  $MaxArLength,
} from '@eicrud/core/validation';
import { MyUser } from '../myuser/myuser.entity';

export class Slice {
  size?: number = 1;

  @$MaxSize(10)
  name: string;
}

export class Seed {
  size: number = 1;

  @$MaxSize(10)
  name: string;
}

export class Melon implements CrudEntity {
  id: string;

  @ManyToOne(() => MyUser)
  owner: MyUser | string;

  ownerEmail: string;

  size: number = 1;

  name: string;

  @$MaxSize(100, 5)
  longName: string;

  @Embedded(() => Slice, { nullable: true })
  @$Type(Slice)
  firstSlice: Slice;

  @Embedded(() => Seed, { array: true, nullable: true })
  @$Type(Seed)
  @$Transform(
    (value: Seed) => {
      return { ...value, name: value.name.toLowerCase() };
    },
    { each: true },
  )
  @$Transform((value: Seed[]) => {
    return value.filter((v) => v.size > 0);
  })
  @$MaxArLength(5, 2)
  seeds: Seed[];

  stringSeeds: string[];

  price: number;

  createdAt: Date;

  updatedAt: Date;
}
