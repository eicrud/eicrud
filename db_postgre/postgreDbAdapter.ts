import { ObjectId } from "@mikro-orm/mongodb";
import { CrudConfigService } from "../core/crud/crud.config.service";
import { CrudDbAdapter } from "../core/crud/dbAdapter/crudDbAdapter";
import { CrudContext } from "../core/crud/model/CrudContext";


export class PostgreDbAdapter extends CrudDbAdapter {
    
    getIncrementUpdate(increments: { [key: string]: number; }, ctx: CrudContext) {
        let updateSql = {};
        for (let key in increments) {
            updateSql[key] = () => `${key} + ${increments[key]}`;
        }
        return updateSql;
    }

    createNewId(str?: string) {
        return str || Math.random().toString(36).substring(7);
    }

    makeInQuery(ids: any, query: any) {
        query[this.crudConfig.id_field] = { $in: ids };
    }

    checkId(id: any) {
        return id;
    }

    createId(crudConfig: CrudConfigService) {
        let id = Math.random().toString(36).substring(7);
        return this.formatId(id, crudConfig);
    }

    formatId(id: any, crudConfig: CrudConfigService) {
        return id;
    }

}