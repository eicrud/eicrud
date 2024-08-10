import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { $Transform } from '@eicrud/core/validation/decorators';
import { ILoginDto } from '@eicrud/shared/interfaces';

//@eicrud:cli:export:skip-superclient
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
