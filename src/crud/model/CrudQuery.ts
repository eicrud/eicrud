import { IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { CrudOptions } from "./CrudOptions";
import { Transform, Type } from "class-transformer";


export class CrudQuery {

    @IsString()
    service: string;

    @IsOptional()
    @Type(() => CrudOptions)
    @ValidateNested()
    options?: CrudOptions;
    
    @IsOptional()
    @Transform(({value}) => JSON.parse(value))
    query?: any;

    @IsOptional()
    @IsString()
    cmd?: string;

}

export class BackdoorQuery {

    @IsString()
    service: string;

    @IsString()
    methodName: string;
  
    @IsInt()
    @IsOptional()
    ctxPos?: number;

    @IsInt()
    @IsOptional()
    inheritancePos?: number;

}