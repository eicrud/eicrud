import { Controller, Get, Module } from "@nestjs/common";
import { MyConfigService } from "./myconfig.service";
import { MyEmailService } from "./myemail.service";
import { MyUserService } from "./myuser.service";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { MongoDriver } from "@mikro-orm/mongodb";
import { MyUser } from "./entities/MyUser";
import { UserProfile } from "./entities/UserProfile";
import { FakeEmail } from "./entities/FakeEmail";
import { Melon } from "./entities/Melon";
import { OCRUDModule } from "../core/ocrud.module";
import { MelonService } from "./melon.service";
import { CRUD_CONFIG_KEY } from "../core/crud/crud.config.service";
import { MyProfileService } from "./profile.service";
import { Picture } from "./entities/Picture";
import { NestFastifyApplication, FastifyAdapter } from "@nestjs/platform-fastify";
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });


export function createNestApplication(moduleRef: any): any {
    return moduleRef.createNestApplication(new FastifyAdapter());
}

export async function readyApp(app){
    return await app.getHttpAdapter().getInstance().ready();
}

export const getModule = (dbName) => { 

    dbName = "test-" + dbName.replace('.spec.ts', '').replaceAll('.', '-')

    return {
        imports: [
            MikroOrmModule.forRoot({
                entities: [MyUser, UserProfile, FakeEmail, Melon, Picture],
                driver: MongoDriver,
                dbName,
            }),
            OCRUDModule.forRoot(),
        ],
        controllers: [],
        providers: [MyEmailService, MyUserService, MelonService, MyProfileService,
            {
                provide: CRUD_CONFIG_KEY,
                useClass: MyConfigService,
              }
        ],
    }
}
