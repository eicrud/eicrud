import {
  $MaxSize,
  $ToLowerCase,
  $Transform,
  $Type,
} from '@eicrud/core/validation';
import { IsString, IsOptional, MaxLength } from 'class-validator';

class subTestCmdDto {
  @IsString()
  @$MaxSize(100)
  @$ToLowerCase()
  subfield: string;
}

export class CanCannotCmdDto {
  @IsString()
  @MaxLength(30)
  @$Transform((value: string) => value.toUpperCase())
  returnMessage: string;

  @IsOptional()
  @$Type(subTestCmdDto)
  sub?: subTestCmdDto;

  @IsOptional()
  forbiddenField?: string;
}
