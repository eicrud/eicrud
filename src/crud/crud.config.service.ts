import { Injectable } from "@nestjs/common";
import { CrudRole } from "../auth/model/CrudRole";
import { CrudService } from "./crud.service";
import { CrudGlobalHooks } from "./model/CrudHooks";
import { CrudUserService } from "../user/crud-user.service";
import { LogService } from "../log/log.service";
import { EntityManager } from "@mikro-orm/core";
import { CrudContext } from "../auth/model/CrudContext";
import { CrudAuthorizationService } from "./crud.authorization.service";



@Injectable()
export class CrudConfigService {

    services: CrudService<any>[] = [];
    id_field: string = '_id';
    guest_role: string = "guest" 
    roles: CrudRole[] = [];
    hooks: CrudGlobalHooks =
    {
        beforeAllHook: function (ctx: CrudContext): Promise<any> {
            return Promise.resolve();
        },
        afterAllHook: function (res: any, ctx: CrudContext): Promise<any> {
            return Promise.resolve();
        },
        errorAllHook: function (error: Error, ctx: CrudContext): Promise<any> {
            return Promise.resolve();
        }
    };

    constructor(public userService: CrudUserService, 
        public logService: LogService,
        public entityManager: EntityManager,
        ) {

            this.services.push(...[
                userService,
                logService
            ])

    }


}