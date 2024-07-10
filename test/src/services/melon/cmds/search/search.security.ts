import { CmdSecurity } from '@eicrud/core/config';
import { search } from './search.action';
import { SearchDto } from './search.dto';
import { Melon } from '../../melon.entity';

const getCmdSecurity = (search, melon): CmdSecurity<SearchDto, Melon> => {
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
