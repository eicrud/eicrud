import { Property, Embeddable } from '@mikro-orm/core';
import { IsString, IsInt } from 'class-validator';
import { getSecurity } from '../my-user/my-user.security';
@Embeddable()
export class SharedEmbeddable {
  @IsString()
  @Property()
  name: string;

  @IsInt()
  @Property()
  size: number;
}
