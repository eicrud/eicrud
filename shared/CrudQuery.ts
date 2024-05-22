import { IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { CrudOptions } from "./CrudOptions";
import { $Type, $Transform, $MaxSize } from "../core/crud/transform/decorators";


export class CrudQuery {

    @IsString()
    service: string;

    @IsOptional()
    @$Type(CrudOptions)
    @$Transform((value) => {
        return JSON.parse(value)
    })
    @ValidateNested()
    options?: CrudOptions;
    
    @IsOptional()
    @$Transform((value) => JSON.parse(value))
    @$MaxSize(-1)
    query?: any;

    @IsOptional()
    @IsString()
    cmd?: string;

}

export class BackdoorQuery {

    service: string;

    methodName: string;
  
    ctxPos?: number;

    inheritancePos?: number;

    @$Transform((value) => JSON.parse(value))
    undefinedArgs?: string | number[];

}