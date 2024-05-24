import { CrudSecurity } from "../../../core/crud/model/CrudSecurity";

export function getSecurity(tk_entity_uname: string) { 
    return {
        rolesRights: {
            guest: {
                defineCRUDAbility(can, cannot, ctx) {
                }
            }
        },
    } as CrudSecurity
}