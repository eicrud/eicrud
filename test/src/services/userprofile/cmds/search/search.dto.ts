import { $Transform } from '@eicrud/core/validation';
import { IsString, IsOptional } from 'class-validator';

export default class SearchDto {
  @IsString()
  @$Transform((v: string) => v.replace(/[.*+?^$}{)(|[\]\\]/g, '\\$&'))
  userNameLike: string;

  @IsOptional()
  @IsString()
  type?: string;
}
