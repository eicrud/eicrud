import { CrudConfigService } from "@eicrud/core/config";
import { CrudDbAdapter } from "@eicrud/core/config";
import { CrudContext } from "@eicrud/core/crud";
import { MikroORM, IDatabaseDriver, Connection, EntityManager, raw, EntityClass } from "@mikro-orm/core";


export class PostgreDbAdapter extends CrudDbAdapter {
    
    
    async onModuleInit(orm: MikroORM<IDatabaseDriver<Connection>, EntityManager<IDatabaseDriver<Connection>>>) {
    }

    convertColumnName(str){
        return str.split(/(?=[A-Z])/).join('_').toLowerCase()
    }
    
    getIncrementUpdate(increments: { [key: string]: number; }, entity: EntityClass<any>, ctx: CrudContext) {
        let updateSql = {};
        for (let key in increments) {
            if(key.includes('.')){
                const [root, rest] = key.split(/\.(.*)/s);
                const columnName = this.convertColumnName(root);
                updateSql[root] = raw(`jsonb_set(COALESCE("${columnName}"::jsonb, '{}'::jsonb), '{${rest}}', (COALESCE("${columnName}"::text::jsonb->>'${rest}','0')::int + ${increments[key]})::text::jsonb)`)
            }else{
                updateSql[key] = raw(`COALESCE("${this.convertColumnName(key)}",0) + ${increments[key]}`)
            }
        }
        return updateSql;
    }

    getSetUpdate(updates: { [key: string]: any; }) {
        let updateSql = {};
        for (let key in updates) {
            let update = updates[key];
            if(key.includes('.')){
                const [root, rest] = key.split(/\.(.*)/s);
                const columnName = this.convertColumnName(root);
                
                if(update instanceof Date){
                    update = update.toISOString();
                }

                if(typeof update === 'string'){
                    update = `"${update}"`
                }

                updateSql[root] = raw(`jsonb_set(COALESCE("${columnName}"::jsonb, '{}'::jsonb), '{${rest}}', '${update}'::text::jsonb)`)
            }else{
                updateSql[key] = update;
            }
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