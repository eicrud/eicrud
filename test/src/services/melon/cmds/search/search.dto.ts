import { $MaxSize, $Transform } from '@eicrud/core/validation';
import { IsString, IsOptional } from 'class-validator';

export class SearchDto {
  @IsString()
  @IsOptional()
  @$Transform((v: string) => v.replace(/[.*+?^$}{)(|[\]\\]/g, '\\$&'))
  nameLike: string;

  @IsOptional()
  @IsString({ each: true })
  @$MaxSize(-1)
  ids?: string[];

  @IsOptional()
  @IsString()
  ownerEmail?: string;
}
