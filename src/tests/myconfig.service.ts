import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudConfigService } from "../crud/crud.config.service";
import { MyUserService } from "./myuser.service";
import { EntityManager } from "@mikro-orm/mongodb";
import { MikroORM } from '@mikro-orm/core';

import { MyEmailService } from "./myemail.service";
import { MelonService } from "./melon.service";
import { CrudRole } from "../crud/model/CrudRole";
import { BasicMemoryCache } from "../authentification/auth.utils";
import { MyProfileService } from "./profile.service";


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
        public melonService: MelonService,
        public myProfileService: MyProfileService,
        protected orm: MikroORM
    ) {
        super({
            userService,
            entityManager,
            emailService,
            jwtSecret: 'myTestSecret',
            roles: roles,
            cacheManager: new BasicMemoryCache(),
            orm,
            id_field: 'id',
        });
        this.services.push(...[emailService, melonService, myProfileService]);
    }


}
