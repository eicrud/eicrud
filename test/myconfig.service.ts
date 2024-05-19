import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudConfigService } from "../core/crud/crud.config.service";
import { MyUserService } from "./myuser.service";
import { EntityManager } from "@mikro-orm/mongodb";
import { MikroORM } from '@mikro-orm/core';

import { MyEmailService } from "./myemail.service";
import { MelonService } from "./melon.service";
import { CrudRole } from "../core/crud/model/CrudRole";
import { BasicMemoryCache } from "../core/authentification/auth.utils";
import { MyProfileService } from "./profile.service";
import { MongoDbAdapter } from "../db_mongo/mongoDbAdapter";


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
            dbAdapter: new MongoDbAdapter(),
        });

        this.addRoles(roles);
    }


}
