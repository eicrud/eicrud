import { IsString, IsOptional } from 'class-validator';
import { MaxLength } from 'class-validator';

export class CallTestCmdDto {
  @IsString()
  @MaxLength(30)
  returnMessage: string;
}
