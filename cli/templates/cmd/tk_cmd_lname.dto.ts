import { IsString, IsOptional } from "class-validator";


export class tk_cmd_dto_name {

    @IsString()
    @IsOptional()
    myArg: string;

}

//used by super-client, update me here
export type tk_cmd_return_dto_name = string;