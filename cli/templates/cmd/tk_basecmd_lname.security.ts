import { CmdSecurity, baseCmds } from "@eicrud/core/config";


const getCmdSecurity = (tk_cmd_lname, tk_entity_lname): CmdSecurity => { 
    return {
        minTimeBetweenCmdCallMs: 1000,
        dto: baseCmds.tk_cmd_bname.dto,
        rolesRights: {
            user: {
                async defineCMDAbility(can, cannot, ctx) {
                    // Define abilities for user

                }
            }
        },
    }
}

export const tk_cmd_bnameSecurity = {
    getCmdSecurity,
}