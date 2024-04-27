import { CrudOptions } from "./CrudOptions";


export interface CrudQuery {

    service: string,

    options: CrudOptions,

    query: any,

    cmd: string,


}