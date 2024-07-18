import { ITimeoutUserDto } from '@eicrud/shared/interfaces';
import { IsString, IsInt } from 'class-validator';

export class TimeoutUserDto implements ITimeoutUserDto {
  @IsString()
  userId: string;

  @IsInt()
  timeoutDurationMinutes: number;

  @IsString({ each: true })
  allowedRoles: string[];
}
