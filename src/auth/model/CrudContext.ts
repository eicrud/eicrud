import { CrudUser } from "../../user/entity/CrudUser";
import { CrudSecurity } from "./CrudSecurity";

export interface CrudContext {
    serviceName: string, 
    user: CrudUser, 
    security: CrudSecurity, 
    method: string, 
    query: object, 
    data: object
}