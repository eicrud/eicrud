import { IUserIdDto } from '@eicrud/shared/interfaces';
import { IsString } from 'class-validator';

export class logoutEverywhereDto implements IUserIdDto {
  @IsString()
  userId: string;
}
