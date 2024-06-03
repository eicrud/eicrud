import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from "class-validator";
import { $MaxSize } from "../../validation/decorators";
import { ICrudOptions } from '@eicrud/shared/interfaces';

export class CrudOptions implements ICrudOptions  {

    @IsOptional()
    @IsArray()
    @IsString({each: true})
    @$MaxSize(300)
    populate?: string[];

    @IsOptional()
    @IsString()
    mockRole?: string;

    @IsOptional()
    @IsBoolean()
    cached?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({each: true})
    @$MaxSize(300)
    fields?: string[];

    @IsOptional()
    @IsArray()
    @IsString({each: true})
    @$MaxSize(300)
    exclude?: string[];

    @IsOptional()
    @IsInt()
    limit?: number;

    @IsOptional()
    @IsInt()
    offset?: number;

}