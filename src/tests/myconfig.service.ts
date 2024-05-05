import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudConfigService } from "../crud/crud.config.service";
import { MyUserService } from "./myUser.service";
import { EntityManager } from "@mikro-orm/mongodb";
import { MyEmailService } from "./myemail.service";
import { MelonService } from "./melon.service";

@Injectable()
export class MyConfigService extends CrudConfigService  {

    constructor(
        @Inject(forwardRef(() => MyUserService))
        public userService: MyUserService,
        public entityManager: EntityManager,
        public emailService: MyEmailService,
        public melonService: MelonService,
    ) {
        super({
            userService,
            entityManager,
            emailService,
            jwtSecret: 'myTestSecret'
        });

        this.services.push(...[emailService, melonService]);
    }


}
