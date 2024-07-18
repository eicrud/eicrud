import { IChangePasswordDto } from '@eicrud/shared/interfaces';
import { IsOptional, IsBoolean, IsString, IsInt } from 'class-validator';

export class ChangePasswordDto implements IChangePasswordDto {
  @IsOptional()
  @IsBoolean()
  logMeIn: boolean;

  @IsString()
  oldPassword: string;

  @IsString()
  newPassword: string;

  @IsOptional()
  @IsInt()
  expiresInSec: number;
}
