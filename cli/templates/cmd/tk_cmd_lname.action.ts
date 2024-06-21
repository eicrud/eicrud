import { ModuleRef } from "@nestjs/core";
import { tk_cmd_dto_name } from "./tk_cmd_lname.dto";
import { tk_entity_nameService } from "../../tk_entity_lname.service";
import { CrudContext } from "@eicrud/core/crud";

export async function tk_cmd_name(this: tk_entity_nameService, dto: tk_cmd_dto_name, ctx: CrudContext, inheritance?: any ){
    throw new Error('Not implemented');
}