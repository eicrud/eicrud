import { IsString, IsOptional } from 'class-validator';

export class PresentCmdDto {
  @IsString()
  @IsOptional()
  myArg: string;
}

//used by super-client, update me here
export type PresentCmdReturnDto = string;
