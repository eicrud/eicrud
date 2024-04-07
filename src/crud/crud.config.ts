


export class CrudConfig {

    static initApp(app, authGuard, rolesGuard){
        app.useGlobalGuards(authGuard);
        app.useGlobalGuards(rolesGuard);
    }
}

