import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { $Transform } from '@eicrud/core/validation/decorators';
import { ILoginDto, LoginResponseDto } from '@eicrud/shared/interfaces';

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

export class LoginReturnDto implements LoginResponseDto {
  userId: string;
  accessToken?: string;
  refreshTokenSec?: number;
}
