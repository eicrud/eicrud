import { CmdSecurity } from "@eicrud/core/config";
import tk_cmd_name from "./tk_cmd_lname.action";
import tk_cmd_dto_name from "./tk_cmd_lname.dto";


const getCmdSecurity = (tk_cmd_uname, tk_entity_uname): CmdSecurity => { 
    return {
        dto: tk_cmd_dto_name,
        rolesRights: {
            user: {
                async defineCMDAbility(can, cannot, ctx) {
                }
            }
        },
    }
}

export const tk_cmd_nameSecurity = {
    getCmdSecurity,
    action: tk_cmd_name
}