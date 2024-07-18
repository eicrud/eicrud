import { ICreateAccountDto } from '@eicrud/shared/interfaces';
import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { $Transform } from '@eicrud/core/validation';

export class CreateAccountDto implements ICreateAccountDto {
  @IsOptional()
  @IsBoolean()
  logMeIn?: boolean;

  @IsString()
  @$Transform((value) => {
    return value.toLowerCase().trim();
  })
  email: string;

  @IsString()
  password: string;

  @IsString()
  role: string;
}
