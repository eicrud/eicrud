import { EntityManager, MikroORM } from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import { BasicMemoryCache } from "../../core/authentification/auth.utils";
import { CrudConfigService } from "../../core/crud/crud.config.service";
import { CrudRole } from "../../core/crud/model/CrudRole";
import { MongoDbAdapter } from "../../db_mongo/mongoDbAdapter";
import { PostgreDbAdapter } from "../../db_postgre/postgreDbAdapter";
import { MyEmailService } from "../../test/myemail.service";
import { MyUserService } from "../../test/myuser.service";
import { tk_db_adapter } from tk_db_adapter_path

const roles: CrudRole[] = [
    { name: 'guest' },
]

@Injectable()
export class MyConfigService extends CrudConfigService {

    constructor(
        public userService: MyUserService,
        public entityManager: EntityManager,
        public emailService: MyEmailService,
        protected orm: MikroORM
    ) {
        super({
            userService,
            entityManager,
            emailService,
            jwtSecret: process.env.JWT_SECRET || tk_jwt_secret,
            cacheManager: new BasicMemoryCache(),
            orm,
            id_field: 'id',
            dbAdapter: new tk_db_adapter(),
        });

        this.addRoles(roles);
    }


}
