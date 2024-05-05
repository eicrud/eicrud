import { ModuleRef } from "@nestjs/core";
import { CrudService } from "../crud/crud.service";
import { CrudSecurity } from "../crud/model/CrudSecurity";
import { Melon } from "./entities/Melon";
import { MyConfigService } from "./myconfig.service";


const melonSecurity: CrudSecurity = {

}

export class MelonService extends CrudService<Melon> {
    constructor(protected moduleRef: ModuleRef) {

        super(moduleRef, Melon, melonSecurity);
    }
}