import { Property, Embeddable } from '@mikro-orm/core';
import { IsString, IsInt } from 'class-validator';
@Embeddable()
export class SharedEmbeddable {
  @IsString()
  @Property()
  name: string;

  @IsInt()
  @Property()
  size: number;
}
