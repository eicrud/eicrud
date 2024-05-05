import { FindOptions } from "@mikro-orm/core";

export interface CrudOptions extends Partial<FindOptions<any,any>> {
    [x: string]: any;

    mockRole?: string;
    
}