import { CrudConfigService } from "../crud.config.service";
import { CrudContext } from "../model/CrudContext";



export abstract class CrudDbAdapter {

   crudConfig: CrudConfigService;

   setConfigService(crudConfig: CrudConfigService) {
       this.crudConfig = crudConfig;
   }

   abstract getIncrementUpdate(increments: { [key: string]: number }, ctx: CrudContext);

   abstract createNewId(str?: string);

   abstract makeInQuery(ids, query: any);

   abstract checkId(id: any);

   abstract createId(crudConfig: CrudConfigService);

   abstract formatId(id: any, crudConfig: CrudConfigService);

}