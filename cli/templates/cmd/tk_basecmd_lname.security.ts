import { CmdSecurity, baseCmds } from "@eicrud/core/config";
import { tk_entity_name } from "../../tk_entity_lname.entity";


const getCmdSecurity = (tk_cmd_lname, tk_entity_camel_name): CmdSecurity<CmdDto, tk_entity_name> => { 
    return {
        minTimeBetweenCmdCallMs: 1000,
        dto: baseCmds.tk_cmd_camel_name.dto,
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
}

class CmdDto extends baseCmds.tk_cmd_camel_name.dto {};
