import { _utils_cli } from "../utils";
import { Generate } from "./Generate";

const fs = require('fs');

export class Setup {
    
    static action(type, name): Promise<any> {

        const allowedTypes = ['mongo', 'postgre'];
        if (!allowedTypes.includes(type)) {
            throw new Error(`Invalid type: ${type}. Allowed types: ${allowedTypes.join(', ')}`);
        }

        const templateDir = './cli/templates';

        const moduleTemplateFile = templateDir + '/module-imports.ts'

        const moduleImports = [
            "import { MikroOrmModule } from '@mikro-orm/nestjs';",
            "import { EICRUDModule } from '../../core/eicrud.module';",
            "import { CRUDEntities } from './services/index';"
        ]

        const keys: any = {
            tk_db_name: `"${name.toLowerCase()}-db"`,
            tk_db_adapter_path: type === 'mongo' ? "'../db_mongo/mongoDbAdapter'" : "'../db_postgre/postgreDbAdapter'",
            tk_db_adapter: type === 'mongo' ? 'MongoDbAdapter' : 'PostgreDbAdapter',
        }

        if(type === 'mongo') {
            keys.tk_orm_driver = 'MongoDriver';
            moduleImports.push("import { MongoDriver } from '@mikro-orm/mongodb';");
        }else {
            keys.tk_orm_driver = 'PostgreSqlDriver';
            moduleImports.push("import { PostgreSqlDriver } from '@mikro-orm/postgresql';");
        }

        let moduleContent = fs.readFileSync(moduleTemplateFile, 'utf8');
        for(const key in keys) {
            const value = keys[key];
            moduleContent = moduleContent.replace(new RegExp(key, 'g'), value);
        }
        const modulePath = './src/app.module.ts';

        let content = fs.readFileSync(modulePath, 'utf8');
        content = moduleImports.join('\n') + '\n' + content

        const importsReguex = /imports[ ]{0,}:[ ]{1,}\[([^\]]*)\]/;
        const importsMatch = importsReguex.exec(content);
        const getReplaceString = (array) => {
            let rep = array.trim()
            rep = rep ? '  ' + rep + '\n' : ''
            return `imports: [\n${moduleContent}\n${rep}  ]`
        };
        content = _utils_cli.addNewLineToMatched(content, importsReguex, getReplaceString, `Could not find imports array in ${modulePath}`);

        //write content
        fs.writeFileSync(modulePath, content);
        console.log('UPDATED:', modulePath);

        const configPath = './src/eicrud.config.service.ts';
        const configTemplateFile = templateDir + '/eicrud.config.service.ts';
        
        let configContent = fs.readFileSync(configTemplateFile, 'utf8');
        for(const key in keys) {
            const value = keys[key];
            configContent = configContent.replace(new RegExp(key, 'g'), value);
        }

        fs.writeFileSync(configPath, configContent);
        console.log('CREATED:', configPath);

        const rolesTemplateFile = templateDir + '/roles.ts';
        const rolesPath = './src/roles.ts';
        fs.copyFileSync(rolesTemplateFile, rolesPath);
        console.log('CREATED:', rolesPath);

        Generate.service('user');
        Generate.service('email', { nonCrud: true });

        const userServicePath = './src/services/user/user.service.ts';
        let userServiceContent = fs.readFileSync(userServicePath, 'utf8');

        const userServiceImports = [
            "import { CrudUserService } from '../core/user/crud-user.service'",
        ]

        userServiceContent = userServiceImports.join('\n') + '\n' + userServiceContent
        userServiceContent = userServiceContent.replace('CrudService<User>', 'CrudUserService<User>');
        
        fs.writeFileSync(userServicePath, userServiceContent);
        console.log('UPDATED:', userServicePath);

        const userTemplateFile = templateDir + '/user.ts';
        const userPath = './src/services/user/user.entity.ts';
        fs.copyFileSync(userTemplateFile, userPath);
        console.log('UPDATED:', userPath);

        return null;
    }

}