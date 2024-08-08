import { IsString, IsOptional } from 'class-validator';

export class TestTriggerHelloDto {
  @IsString()
  @IsOptional()
  message: string;
}

//used by super-client, update me here
export type TestTriggerHelloReturnDto = string;
