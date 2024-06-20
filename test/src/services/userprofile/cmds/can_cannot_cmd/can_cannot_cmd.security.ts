import { CmdSecurity } from '@eicrud/core/config';
import can_cannot_cmd from './can_cannot_cmd.action';
import CanCannotCmdDto from './can_cannot_cmd.dto';

const getCmdSecurity = (can_cannot_cmd, userprofile): CmdSecurity => {
  return {
    dto: CanCannotCmdDto,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
        },
      },
      guest: {
        async defineCMDAbility(can, cannot, ctx) {
          can(can_cannot_cmd, userprofile);
          cannot(can_cannot_cmd, userprofile);
        },
      },
    },
  };
};

export const canCannotCmdSecurity = {
  getCmdSecurity,
  action: can_cannot_cmd,
};
