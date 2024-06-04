import { ModuleRef } from "@nestjs/core";
import tk_cmd_dto_name from "./tk_cmd_lname.dto";
import { tk_entity_nameService } from "../../tk_entity_lname.service";
import { CrudContext } from "@eicrud/core/crud";

export default async function tk_cmd_name(dto: tk_cmd_dto_name, service: tk_entity_nameService, ctx: CrudContext, inheritance?: any ){
    throw new Error('Not implemented');
}