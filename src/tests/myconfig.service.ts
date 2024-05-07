import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudConfigService } from "../crud/crud.config.service";
import { MyUserService } from "./myuser.service";
import { EntityManager } from "@mikro-orm/mongodb";
import { MyEmailService } from "./myemail.service";
import { MelonService } from "./melon.service";
import { CrudRole } from "../crud/model/CrudRole";
import { BasicMemoryCache } from "../authentification/auth.utils";


const roles: CrudRole[] = [
    {
        name: 'super_admin',
        isAdminRole: true,
        canMock: true,
        inherits: [],
    },
]


@Injectable()
export class MyConfigService extends CrudConfigService  {

    constructor(
        public userService: MyUserService,
        public entityManager: EntityManager,
        public emailService: MyEmailService,
        public melonService: MelonService,
    ) {
        super({
            userService,
            entityManager,
            emailService,
            jwtSecret: 'myTestSecret',
            roles: roles,
            cacheManager: new BasicMemoryCache(),
        });

        this.services.push(...[emailService, melonService]);
    }


}
