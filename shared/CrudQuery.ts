import { IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { CrudOptions } from "./CrudOptions";
import { $Type, $Transform, $MaxSize } from "../core/crud/transform/decorators";
import { _utils } from "../core/utils";


export class CrudQuery {

    @IsString()
    service: string;

    @IsOptional()
    @$Type(CrudOptions)
    @$Transform(_utils.parseIfString)
    @ValidateNested()
    options?: CrudOptions;
    
    @IsOptional()
    @$Transform(_utils.parseIfString)
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

    @$Transform(_utils.parseIfString)
    undefinedArgs?: string | number[];

}