import {
  Allow,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CrudOptions } from './CrudOptions';
import { $Type, $Transform, $MaxSize } from '../../validation/decorators';
import { _utils } from '../../utils';
import { ICrudQuery } from '@eicrud/shared/interfaces';

export class CrudQuery implements ICrudQuery {
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

  cmd?: string;
}

export class MsLinkQuery {
  service: string;

  methodName: string;

  ctxPos?: number;

  inheritancePos?: number;

  @$Transform(_utils.parseIfString)
  undefinedArgs?: string | number[];
}
