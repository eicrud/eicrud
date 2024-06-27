import { ModuleRef } from "@nestjs/core";
import { tk_entity_name } from "./tk_entity_lname.entity";
import { Injectable } from "@nestjs/common";
import { getSecurity } from "./tk_entity_lname.security";
import { CrudService, Inheritance, CrudContext } from "@eicrud/core/crud";
import { serviceCmds } from "./cmds";
import { hooks } from "./tk_entity_lname.hooks";

@Injectable()
export class tk_entity_nameService extends CrudService<tk_entity_name> {
    constructor(protected moduleRef: ModuleRef) {
        const serviceName = CrudService.getName(tk_entity_name);
        super(moduleRef, tk_entity_name, getSecurity(serviceName), { hooks });
    }
    
    // GENERATED START - do not remove

}