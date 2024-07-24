import { CmdSecurity } from '@eicrud/core/config';
import { ghost_cmd } from './ghost_cmd.action';
import { GhostCmdDto } from './ghost_cmd.dto';
import { FakeEmail } from '../../fake-email.entity';

const getCmdSecurity = (
  ghost_cmd,
  fakeEmail,
): CmdSecurity<GhostCmdDto, FakeEmail> => {
  return {
    dto: GhostCmdDto,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
        },
      },
    },
  };
};

export const GhostCmdSecurity = {
  getCmdSecurity,
  action: ghost_cmd,
};
