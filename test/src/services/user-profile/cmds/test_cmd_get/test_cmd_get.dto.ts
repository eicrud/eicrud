import { $Transform } from '@eicrud/core/validation';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class TestCmdGetDto {
  @IsString()
  @MaxLength(30)
  @IsOptional()
  @$Transform((value: string) => value.toUpperCase())
  returnMessage: string;
}

//used by super-client, update me here
export type TestCmdGetReturnDto = string;
