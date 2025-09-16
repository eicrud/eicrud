import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';
import { Token } from './token.entity';
import { RoleType } from '../../eicrud.roles';

export function getSecurity(token: string): CrudSecurity<Token, RoleType> {
  return {
    rolesRights: {
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          // Define abilities for guest
        },
      },
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, token);
      return acc;
    }, {}),
  };
}
