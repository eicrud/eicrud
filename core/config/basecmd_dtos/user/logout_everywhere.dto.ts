import { IUserIdDto } from '@eicrud/shared/interfaces';
import { IsString } from 'class-validator';

export class LogoutEverywhereDto implements IUserIdDto {
  @IsString()
  userId: string;
}
