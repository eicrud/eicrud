import { CmdSecurity } from '@eicrud/core/config';
import { search } from './search.action';
import { SearchDto } from './search.dto';

const getCmdSecurity = (search, userprofile): CmdSecurity => {
  return {
    dto: SearchDto,
    rolesRights: {},
    guestCanUseAll: true,
  };
};

export const searchSecurity = {
  getCmdSecurity,
  action: search,
};
