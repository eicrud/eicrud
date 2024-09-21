import { ICreateAccountDto } from '@eicrud/shared/interfaces';
import {
  IsOptional,
  IsBoolean,
  IsString,
  IsEmail,
  MinLength,
} from 'class-validator';
import { $Transform } from '@eicrud/core/validation';

export class CreateAccountDto implements ICreateAccountDto {
  @IsOptional()
  @IsBoolean()
  logMeIn?: boolean;

  @IsEmail()
  @$Transform((value) => {
    return value.toLowerCase().trim();
  })
  email: string;

  @IsOptional()
  @$Transform((value) => {
    return value.toLowerCase().trim();
  })
  username?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  role: string;

  //@eicrud:cli:export:delete:next-line
  addToUser?: any;
}
