import { ModuleRef } from "@nestjs/core";
import tk_cmd_nameDto from "./tk_cmd_lname.dto";
import { tk_entity_nameService } from "../../tk_entity_lname.service";
import { CrudContext } from "../../../core/crud/model/CrudContext";

export default function tk_cmd_name(service: tk_entity_nameService, dto: tk_cmd_nameDto, ctx: CrudContext, inheritance?: any ){
    throw new Error('Not implemented');
}