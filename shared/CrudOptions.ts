import { FindOptions } from "@mikro-orm/core";
import { IsArray, IsInt, IsOptional, IsString } from "class-validator";
import { $MaxSize } from "../core/crud/transform/decorators";

export class CrudOptions  {

    @IsOptional()
    @IsArray()
    @IsString({each: true})
    @$MaxSize(300)
    populate?: string[];

    @IsOptional()
    @IsString()
    mockRole?: string;

    @IsOptional()
    @IsArray()
    @IsString({each: true})
    @$MaxSize(300)
    fields?: string[];

    @IsOptional()
    @IsInt()
    limit?: number;

    @IsOptional()
    @IsInt()
    offset?: number;

}