import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { IUserIdDto } from '@eicrud/shared/interfaces';

export class UserIdDto implements IUserIdDto {
  @IsString()
  userId: string;
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
