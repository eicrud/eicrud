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
    secureOnly: true,
    rolesRights: {
      guest: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
          can(ping_cmd, superclientTest);
        },
      },
    },
  };
};

export const pingCmdSecurity = {
  getCmdSecurity,
  action: ping_cmd,
};
