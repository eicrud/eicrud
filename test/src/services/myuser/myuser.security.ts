import { CmdSecurity, CrudSecurity, baseCmds } from '@eicrud/core/config';
import { serviceCmds } from './cmds';
import { ITimeoutUserDto } from '@eicrud/shared/interfaces';
import { MyUser } from './myuser.entity';

export function getSecurity(myuser: string): CrudSecurity<MyUser> {
  return {
    rolesRights: {
      guest: {
        async defineCRUDAbility(can, cannot, ctx) {
          // Define abilities for guest
        },
      },
    },

    cmdSecurityMap: {
      ...Object.keys(serviceCmds).reduce((acc, cmd) => {
        acc[cmd] = serviceCmds[cmd].getCmdSecurity(cmd, myuser);
        return acc;
      }, {}),
      ...{
        [baseCmds.createAccount.name]: {
          dto: baseCmds.createAccount.dto,
          rolesRights: {
            guest: {
              async defineCMDAbility(can, cannot, ctx) {
                can(baseCmds.createAccount.name, 'my-user', { role: 'user' });
              },
            },
          },
        },
        [baseCmds.logoutEverywhere.name]: {
          dto: baseCmds.logoutEverywhere.dto,
          rolesRights: {
            user: {
              async defineCMDAbility(can, cannot, ctx) {
                can(baseCmds.logoutEverywhere.name, 'my-user', {
                  userId: ctx.userId,
                });
              },
            },
          },
        },
        [baseCmds.timeoutUser.name]: {
          rolesRights: {
            moderator: {
              async defineCMDAbility(can, cannot, ctx) {
                const dto: ITimeoutUserDto = ctx.data;
                const allowed = ['user', 'moderator'];
                if (
                  dto.allowedRoles?.length &&
                  dto.allowedRoles.every((r) => allowed.includes(r))
                ) {
                  can(baseCmds.timeoutUser.name, 'my-user');
                }
              },
            },
          },
        },
        ...[
          baseCmds.sendVerificationEmail,
          baseCmds.verifyEmail,
          baseCmds.sendPasswordResetEmail,
          baseCmds.changePassword,
          baseCmds.resetPassword,
          baseCmds.login,
          baseCmds.checkJwt,
          baseCmds.logout,
        ].reduce((acc, cmd) => {
          acc[cmd.name] = {
            dto: cmd.dto,
            rolesRights: {
              guest: {
                async defineCMDAbility(can, cannot, ctx) {
                  can(cmd.name, 'my-user');
                },
              },
            },
          } as CmdSecurity<MyUser>;
          return acc;
        }, {}),
      },
    },
  };
}
