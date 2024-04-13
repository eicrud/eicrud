import { INestApplication } from "@nestjs/common";



export class CrudConfig {

    static initApp(app: INestApplication, authGuard, rolesGuard){
        app.useGlobalGuards(authGuard);
    }
}

