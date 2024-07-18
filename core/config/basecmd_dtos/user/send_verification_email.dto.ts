import { ISendVerificationEmailDto } from '@eicrud/shared/interfaces';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendVerificationEmailDto implements ISendVerificationEmailDto {
  @IsEmail()
  @IsOptional()
  newEmail: string;

  @IsOptional()
  @IsString()
  password: string;
}
