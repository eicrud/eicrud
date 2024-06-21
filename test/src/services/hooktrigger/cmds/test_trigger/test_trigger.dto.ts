import { IsString, IsOptional } from 'class-validator';

export class TestTriggerDto {
  @IsString()
  @IsOptional()
  myArg: string;
}
