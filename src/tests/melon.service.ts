import { ModuleRef } from "@nestjs/core";
import { CrudService } from "../crud/crud.service";
import { CrudSecurity } from "../crud/model/CrudSecurity";
import { Melon } from "./entities/Melon";
import { MyConfigService } from "./myconfig.service";
import { Injectable } from "@nestjs/common";


const melonSecurity: CrudSecurity = {

}
@Injectable()
export class MelonService extends CrudService<Melon> {
    constructor(protected moduleRef: ModuleRef) {

        super(moduleRef, Melon, melonSecurity);
    }
}