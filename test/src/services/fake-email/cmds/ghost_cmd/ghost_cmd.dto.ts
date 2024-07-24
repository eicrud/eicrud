import { IsString, IsOptional } from 'class-validator';

//@eicrud:cli:export:hide
export class GhostCmdDto {
  @IsString()
  @IsOptional()
  myArg: string;
}

//used by super-client, update me here
export type GhostCmdReturnDto = string;
