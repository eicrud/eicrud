import { Connection, IDatabaseDriver, ObjectId } from "@mikro-orm/mongodb";
import { CrudConfigService } from "@eicrud/core/config";
import { CrudDbAdapter } from "@eicrud/core/config";
import { CrudContext } from "@eicrud/core/crud";
import { MikroORM, EntityManager, EntityClass } from "@mikro-orm/core";

export class MongoDbAdapter extends CrudDbAdapter {
    
    async onModuleInit(orm: MikroORM<IDatabaseDriver<Connection>, EntityManager<IDatabaseDriver<Connection>>>) {
        await orm.schema.ensureIndexes();
    }
    
    getIncrementUpdate(increments: { [key: string]: number; }, entity: EntityClass<any>, ctx: CrudContext) {
        let updateMongo = { $inc: {} };
        for (let key in increments) {
            updateMongo.$inc[key] = increments[key];
        }
        return updateMongo;
    }

    getSetUpdate(updates: { [key: string]: any; }) {
        let updateMongo = { $set: {} };
        for (let key in updates) {
            updateMongo.$set[key] = updates[key];
        }
        return updateMongo;
    }


    createNewId(str?: string) {
          return str ? new ObjectId(str) : new ObjectId();
    }

    makeInQuery(ids: any, query: any) {
        ids = ids.map(id => this.convertMongoPrimaryKey(id));
        query[this.crudConfig.id_field] = { $in: ids };
    }

    checkId(id: any) {
        if (typeof id == 'string' && id.length === 24 && id.match(/^[0-9a-fA-F]{24}$/)) {
            let oldValue = id;
            const newValue = new ObjectId(id as string);
            if (newValue.toString() === oldValue) {
                return newValue;
            }
        };
        return id;
    }

    createId(crudConfig: CrudConfigService) {
        let id = new ObjectId();
        return this.formatId(id, crudConfig);
    }

    formatId(id: any, crudConfig: CrudConfigService) {
        return id?.toString();
    }

    convertMongoPrimaryKey(key) {
        if (key && typeof key == 'string') {
            return new ObjectId(key as string);
        }
        return key;
    }
}