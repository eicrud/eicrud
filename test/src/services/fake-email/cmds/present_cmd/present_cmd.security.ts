import { CmdSecurity } from '@eicrud/core/config';
import { present_cmd } from './present_cmd.action';
import { PresentCmdDto } from './present_cmd.dto';
import { FakeEmail } from '../../fake-email.entity';

const getCmdSecurity = (
  present_cmd,
  fakeEmail,
): CmdSecurity<PresentCmdDto, FakeEmail> => {
  return {
    dto: PresentCmdDto,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          // Define abilities for user
        },
      },
    },
  };
};

export const PresentCmdSecurity = {
  getCmdSecurity,
  action: present_cmd,
};
