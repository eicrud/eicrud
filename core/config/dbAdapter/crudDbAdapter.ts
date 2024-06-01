import { EntityClass, MikroORM } from "@mikro-orm/core";
import { CrudConfigService } from "../crud.config.service";
import { CrudContext } from "../../crud/model/CrudContext";

export abstract class CrudDbAdapter {

   crudConfig: CrudConfigService;

   setConfigService(crudConfig: CrudConfigService) {
       this.crudConfig = crudConfig;
   }
   
   abstract onModuleInit(orm: MikroORM): Promise<any>;

   abstract getIncrementUpdate(increments: { [key: string]: number }, entity: EntityClass<any>, ctx: CrudContext);

   abstract getSetUpdate(updates: { [key: string]: any; });


   abstract createNewId(str?: string);

   abstract makeInQuery(ids, query: any);

   abstract checkId(id: any);

   abstract createId(crudConfig: CrudConfigService);

   abstract formatId(id: any, crudConfig: CrudConfigService);

}