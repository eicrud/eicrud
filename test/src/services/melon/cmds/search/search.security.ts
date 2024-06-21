import { CmdSecurity } from '@eicrud/core/config';
import search from './search.action';
import SearchDto from './search.dto';

const getCmdSecurity = (search, melon): CmdSecurity => {
  return {
    dto: SearchDto,
    batchField: 'ids',
    rolesRights: {
      guest: {
        maxBatchSize: 200,
        async defineCMDAbility(can, cannot, ctx) {
          can('search', melon);
        },
      },
    },
  };
};

export const searchSecurity = {
  getCmdSecurity,
  action: search,
};
