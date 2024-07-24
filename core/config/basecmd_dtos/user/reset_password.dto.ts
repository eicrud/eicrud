import { IResetPasswordDto } from '@eicrud/shared/interfaces';
import { IsOptional, IsBoolean, IsString, IsInt } from 'class-validator';

export class ResetPasswordDto implements IResetPasswordDto {
  @IsOptional()
  @IsBoolean()
  logMeIn: boolean;

  @IsString()
  token_id: string;

  @IsString()
  newPassword: string;

  @IsOptional()
  @IsInt()
  expiresInSec: number;
}
