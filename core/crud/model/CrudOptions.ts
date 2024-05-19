import { FindOptions } from "@mikro-orm/core";
import { IsInt, IsOptional, IsString } from "class-validator";

export class CrudOptions  {

    @IsOptional()
    @IsString({each: true})
    populate?: string[];

    @IsOptional()
    @IsString()
    mockRole?: string;

    @IsOptional()
    @IsString({each: true})
    fields?: string[];

    @IsOptional()
    @IsInt()
    limit?: number;

    @IsOptional()
    @IsInt()
    offset?: number;


    
}