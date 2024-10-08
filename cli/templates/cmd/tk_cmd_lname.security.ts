import { CmdSecurity } from "@eicrud/core/config";
import { tk_cmd_name } from "./tk_cmd_lname.action";
import { tk_cmd_dto_name, tk_cmd_return_dto_name } from "./tk_cmd_lname.dto";
import { tk_entity_name } from "../../tk_entity_lname.entity";
import { hooks } from "./tk_cmd_lname.hooks";
tk_import_role_type

const getCmdSecurity = (tk_cmd_lname, tk_entity_camel_name): CmdSecurity<tk_cmd_dto_name, tk_entity_name, tk_cmd_return_dto_name, tk_role_type> => { 
    return {
        dto: tk_cmd_dto_name,
        hooks, 
        rolesRights: {
            user: {
                async defineCMDAbility(can, cannot, ctx) {
                    // Define abilities for user

                }
            }
        },
    }
}

export const tk_cmd_camel_nameSecurity = {
    getCmdSecurity,
    action: tk_cmd_name
}