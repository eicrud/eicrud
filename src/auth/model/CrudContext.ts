import { CrudOptions } from "../../crud/model/CrudOptions";
import { CrudUser } from "../../user/entity/CrudUser";
import { CrudSecurity } from "./CrudSecurity";

export interface CrudContext {
    serviceName: string, 
    user: CrudUser, 
    method: string, 
    security: CrudSecurity,
    query: any, 
    data: any,
    type: "crud" | "cmd",
    options: CrudOptions,


}