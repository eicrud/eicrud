import { CrudSecurity } from "@eicrud/core/config";
import { serviceCmds } from "./cmds";
import { tk_entity_name } from "./tk_entity_lname.entity";

export function getSecurity(tk_entity_camel_name: string): CrudSecurity<tk_entity_name> { 
    return {
        rolesRights: {
            guest: {
                async defineCRUDAbility(can, cannot, ctx) {
                    // Define abilities for guest
                    
                }
            }
        },

        cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
            acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, tk_entity_camel_name); return acc;
        }, {})
    }
}