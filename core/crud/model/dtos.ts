import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { $Transform } from '../../validation/decorators';
import { ILoginDto, IUserIdDto } from '@eicrud/shared/interfaces';

export class UserIdDto implements IUserIdDto {
  @IsString()
  userId: string;
}
export class LoginDto implements ILoginDto {
  @IsString()
  @$Transform((value) => {
    return value.toLowerCase().trim();
  })
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  twoFA_code?: string;

  @IsOptional()
  @IsInt()
  expiresInSec?: number;
}

export interface ICrudRightsFieldInfo {
  maxSize?: number;
  maxLength?: number;
  type?: Record<string, ICrudRightsFieldInfo>;
}
export interface ICrudRightsInfo {
  maxItemsPerUser?: number;
  userItemsInDb?: number;
  userCmdCount?: Record<string, { max: number; performed: number }>;
  fields?: Record<string, ICrudRightsFieldInfo>;
  maxBatchSize?: number;
}

export class GetRightDto {
  @IsOptional()
  @IsBoolean()
  maxItemsPerUser?: boolean;

  @IsOptional()
  @IsBoolean()
  userItemsInDb?: boolean;

  @IsOptional()
  @IsBoolean()
  fields?: boolean;

  @IsOptional()
  @IsBoolean()
  userCmdCount?: boolean;

  @IsOptional()
  @IsBoolean()
  maxBatchSize?: boolean;
}
