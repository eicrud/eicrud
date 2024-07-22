import { CmdSecurity } from '@eicrud/core/config';
import { present_cmd } from './present_cmd.action';
import { PresentCmdDto } from './present_cmd.dto';
import { Picture } from '../../picture.entity';

const getCmdSecurity = (
  present_cmd,
  picture,
): CmdSecurity<PresentCmdDto, Picture> => {
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
