import { CmdSecurity } from '@eicrud/core/config';
import { ghost_cmd } from './ghost_cmd.action';
import { GhostCmdDto } from './ghost_cmd.dto';
import { SuperclientTestExclude } from '../../superclient-test-exclude.entity';

const getCmdSecurity = (
  ghost_cmd,
  superclientTestExclude,
): CmdSecurity<GhostCmdDto, SuperclientTestExclude> => {
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

export const ghostCmdSecurity = {
  getCmdSecurity,
  action: ghost_cmd,
};
