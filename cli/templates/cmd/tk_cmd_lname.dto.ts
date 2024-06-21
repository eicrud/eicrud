import { IsString, IsOptional } from "class-validator";


export class tk_cmd_dto_name {

    @IsString()
    @IsOptional()
    myArg: string;

}