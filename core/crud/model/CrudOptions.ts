import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { $MaxSize } from '@eicrud/core/validation/decorators';
import { ICrudOptions } from '@eicrud/shared/interfaces';

export class CrudOptions<T = any> implements ICrudOptions {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @$MaxSize(300)
  populate?: `${Extract<keyof T, string>}${string}`[];

  @IsOptional()
  @IsString()
  mockRole?: string;

  @IsOptional()
  @IsBoolean()
  cached?: boolean;

  @IsOptional()
  @IsBoolean()
  jwtCookie?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @$MaxSize(300)
  fields?: Extract<keyof T, string>[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @$MaxSize(300)
  exclude?: string[];

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsInt()
  offset?: number;

  /**
   * Allow the entity ID to be pregenerated in create operations
   * @warning Letting users set IDs can lead to security issues
   */
  @IsOptional()
  @IsBoolean()
  allowIdOverride?: boolean;
}
