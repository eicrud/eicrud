import { CrudSecurity } from "../../../core/crud/model/CrudSecurity";
import { serviceCmds } from "./cmds";

export function getSecurity(tk_entity_uname: string): CrudSecurity { 
    return {
        rolesRights: {
            guest: {
                async defineCRUDAbility(can, cannot, ctx) {
                }
            }
        },

        cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
            acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, tk_entity_uname); return acc;
        }, {})
    }
}