import { CmdSecurity } from '@eicrud/core/config';
import { ping_cmd } from './ping_cmd.action';
import { PingCmdDto } from './ping_cmd.dto';
import { SuperclientTest } from '../../superclient-test.entity';

const getCmdSecurity = (
  ping_cmd,
  superclientTest,
): CmdSecurity<PingCmdDto, SuperclientTest> => {
  return {
    dto: PingCmdDto,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
        },
      },
    },
  };
};

export const pingCmdSecurity = {
  getCmdSecurity,
  action: ping_cmd,
};
