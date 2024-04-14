import { INestApplication } from "@nestjs/common";



export class CrudGlobalConfig {

    static initApp(app: INestApplication, authGuard, rolesGuard){
        app.useGlobalGuards(authGuard);
    }
}

