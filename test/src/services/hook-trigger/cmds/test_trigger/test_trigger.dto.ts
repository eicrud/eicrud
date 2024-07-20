import { IsString, IsOptional, IsInt } from 'class-validator';

export class TestTriggerDto {
  @IsString()
  @IsOptional()
  message: string;

  @IsInt()
  @IsOptional()
  setLen: number;
}
