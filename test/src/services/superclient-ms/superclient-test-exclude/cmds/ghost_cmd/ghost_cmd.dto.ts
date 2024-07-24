import { IsString, IsOptional } from 'class-validator';

export class GhostCmdDto {
  @IsString()
  @IsOptional()
  myArg: string;
}

//used by super-client, update me here
export type GhostCmdReturnDto = string;
