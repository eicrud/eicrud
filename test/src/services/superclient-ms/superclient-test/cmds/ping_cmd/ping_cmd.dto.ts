import { IsString, IsOptional } from 'class-validator';

export class PingCmdDto {
  @IsString()
  @IsOptional()
  myArg: string;

  //@eicrud:cli:export:delete:next-line
  missingArg: string;
}

//used by super-client, update me here
export type PingCmdReturnDto = string;
