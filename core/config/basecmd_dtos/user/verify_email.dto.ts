import { IVerifyTokenDto } from '@eicrud/shared/interfaces';
import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class VerifyEmailDto implements IVerifyTokenDto {
  @IsOptional()
  @IsBoolean()
  logMeIn: boolean;

  @IsString()
  token_id: string;
}
