import { CrudRole } from "../../auth/model/CrudRole";
import { CrudService } from "../crud.service";
import { CrudGlobalHooks } from "./CrudHooks";


export class CrudConfig{

    services: CrudService<any>[];

    id_field: string = '_id';

    guest_role: string = "guest" 

    roles: CrudRole[];

    hooks: CrudGlobalHooks;
    
}