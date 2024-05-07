import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudAuthService } from "../authentification/auth.service";
import { CrudAuthorizationService } from "../crud/crud.authorization.service";
import { CrudService } from "../crud/crud.service";
import { CrudSecurity } from "../crud/model/CrudSecurity";
import { CrudUserService } from "../user/crud-user.service";
import { MyUser } from "./entities/MyUser";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";



const myUserSecurity: CrudSecurity = {

}

@Injectable()
export class MyUserService extends CrudUserService<MyUser> {

    constructor(
        protected moduleRef: ModuleRef,
    ) {
        super(moduleRef, MyUser, myUserSecurity);
    }
    
}