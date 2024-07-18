import { ISendPasswordResetEmailDto } from '@eicrud/shared/interfaces';
import { IsEmail } from 'class-validator';

export class SendPasswordResetEmailDto implements ISendPasswordResetEmailDto {
  @IsEmail()
  email: string;
}
