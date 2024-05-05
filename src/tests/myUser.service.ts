import { Inject, forwardRef } from "@nestjs/common";
import { CrudAuthService } from "../authentification/auth.service";
import { CrudAuthorizationService } from "../crud/crud.authorization.service";
import { CrudService } from "../crud/crud.service";
import { CrudSecurity } from "../crud/model/CrudSecurity";
import { CrudUserService } from "../user/crud-user.service";
import { MyUser } from "./entities/MyUser";
import { MyConfigService } from "./myconfig.service";



const myUserSecurity: CrudSecurity = {

}


export class MyUserService extends CrudUserService<MyUser> {

    constructor(
        @Inject(forwardRef(() => MyConfigService))
        protected crudConfig: MyConfigService,

        @Inject(forwardRef(() => CrudAuthorizationService))
        protected authorizationService: CrudAuthorizationService,
        
        @Inject(forwardRef(() => CrudAuthService))
        protected authService: CrudAuthService,
    ) {
        super(crudConfig, authorizationService, authService, myUserSecurity, MyUser);
    }

    
}