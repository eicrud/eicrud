import { IsOptional, IsString, ValidateNested } from "class-validator";
import { CrudOptions } from "./CrudOptions";
import { Type } from "class-transformer";


export class CrudQuery {

    @IsString()
    service: string;

    @IsOptional()
    @Type(() => CrudOptions)
    @ValidateNested()
    options?: CrudOptions;
    
    @IsOptional()
    query?: any;

    @IsOptional()
    @IsString()
    cmd?: string;



}