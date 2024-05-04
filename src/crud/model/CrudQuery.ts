import { CrudOptions } from "./CrudOptions";


export interface CrudQuery<T> {

    service?: string,

    options?: CrudOptions,

    query?: T,

    cmd?: string,



}