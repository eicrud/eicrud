import { CrudSecurity } from "../../../core/crud/model/CrudSecurity";

export function getSecurity(tk_entity_uname: string): CrudSecurity  { 
    return {
        rolesRights: {
            guest: {
                async defineCRUDAbility(can, cannot, ctx) {
                }
            }
        },
    }
}