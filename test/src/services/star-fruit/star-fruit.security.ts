import { CrudSecurity } from '@eicrud/core/config';
import { serviceCmds } from './cmds';
import { StarFruit } from './star-fruit.entity';

export function getSecurity(starFruit: string): CrudSecurity<StarFruit> {
  return {
    rolesRights: {
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          // Define abilities for guest
          can('crud', starFruit);
        },

        async defineOPTAbility(can, cannot, ctx) {
          can('returnUpdatedEntity', starFruit);
        },
      },
    },

    cmdSecurityMap: Object.keys(serviceCmds).reduce((acc, cmd) => {
      acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, starFruit);
      return acc;
    }, {}),
  };
}
