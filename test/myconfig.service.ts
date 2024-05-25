import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudConfigService, MicroServicesOptions } from "../core/crud/crud.config.service";
import { MyUserService } from "./myuser.service";
import { EntityManager } from "@mikro-orm/mongodb";
import { MikroORM } from '@mikro-orm/core';

import { MyEmailService } from "./myemail.service";
import { CrudRole } from "../core/crud/model/CrudRole";
import { BasicMemoryCache } from "../core/authentification/auth.utils";
import { MongoDbAdapter } from "../db_mongo/mongoDbAdapter";
import { MyUser } from "./entities/MyUser";
import { UserProfile } from "./entities/UserProfile";
import { Picture } from "./entities/Picture";
import { Melon } from "./entities/Melon";
import { FakeEmail } from "./entities/FakeEmail";
import { PostgreDbAdapter } from "../db_postgre/postgreDbAdapter";


const roles: CrudRole[] = [
    {
        name: 'super_admin',
        isAdminRole: true,
        canMock: true,
        inherits: ['admin'],
    },
    {
        name: 'admin',
        isAdminRole: true,
        canMock: true,
        inherits: ['trusted_user'],
    },
    {
        name: 'moderator',
        inherits: ['trusted_user'],
    },    {
        name: 'trusted_user',
        inherits: ['user'],
    },
    {
        name: 'user',
        inherits: ['guest'],
    },
    { name: 'guest' },

]


const msOptions = new MicroServicesOptions();

msOptions.username = 'backDoorUser';
msOptions.password = 'zMaXZAAQlqfZWkvm4545za';

msOptions.microServices = {
    "entry": {
        services: [],
        openBackDoor: false,
        openController: true,
        url: "http://localhost:3004",
        allowNonSecureUrl: true,
        proxyCrudController: process.env.TEST_CRUD_PROXY ? true : false,
        proxyAuthTo: process.env.TEST_CRUD_PROXY ? 'user' : undefined
    },
    "user": {
        services: [MyUser],
        openBackDoor: true,
        openController: process.env.TEST_CRUD_PROXY ? true : false,
        url: "http://localhost:3005",
        allowNonSecureUrl: true
    },
    "melon": {
        services: [Melon, UserProfile, Picture],
        openBackDoor: true,
        openController: process.env.TEST_CRUD_PROXY ? true : false,
        url: "http://localhost:3006",
        allowNonSecureUrl: true
    },
    "email": {
        services: [FakeEmail],
        openBackDoor: true,
        openController: process.env.TEST_CRUD_PROXY ? true : false,
        url: "http://localhost:3007",
        allowNonSecureUrl: true
    }
}

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
            jwtSecret: 'myTestSecret',
            cacheManager: new BasicMemoryCache(),
            orm,
            id_field: 'id',
            captchaService: true,
            watchTrafficOptions: {
                ddosProtection: true,
            },
            dbAdapter: process.env.TEST_CRUD_DB == 'postgre' ? new PostgreDbAdapter() : new MongoDbAdapter(),
            microServicesOptions: msOptions,
        });

        this.addRoles(roles);
    }


}
