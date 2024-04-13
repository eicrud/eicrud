import { CrudRole } from "../../auth/model/CrudRole";
import { CrudService } from "../crud.service";
import { CrudGlobalHooks } from "./CrudHooks";


export interface CrudConfig{

    services: CrudService<any>[],

    roles: CrudRole[],

    hooks: CrudGlobalHooks;
    
}