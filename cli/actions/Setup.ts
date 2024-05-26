import { _utils_cli } from "../utils.js";
import { Generate } from "./Generate.js";
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import child_process from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class Setup {
    
    static action(type, name): Promise<any> {
        let packages = ['@eicrud/core', '@eicrud/shared'];
        const allowedTypes = ['mongo', 'postgre'];
        if (!allowedTypes.includes(type)) {
            throw new Error(`Invalid type: ${type}. Allowed types: ${allowedTypes.join(', ')}`);
        }

        const templateDir = path.join(__dirname, '../templates');

        const moduleTemplateFile = path.join(templateDir, 'module-imports.ts');

        const moduleImports = [
            "import { MikroOrmModule } from '@mikro-orm/nestjs';",
            "import { EICRUDModule } from '@eicrud/core';",
            "import { CRUDEntities } from './services/index';"
        ]

        const keys: any = {
            tk_db_name: `"${name.toLowerCase()}-db"`,
            tk_db_adapter_path: type === 'mongo' ? "'@eicrud/mongodb'" : "'@eicrud/postgresql'",
            tk_db_adapter: type === 'mongo' ? 'MongoDbAdapter' : 'PostgreDbAdapter',
        }

        if(type === 'mongo') {
            packages.push('@eicrud/mongodb');
            keys.tk_orm_driver = 'MongoDriver';
            moduleImports.push("import { MongoDriver } from '@mikro-orm/mongodb';");
        }else {
            packages.push('@eicrud/postgresql');
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
        const configTemplateFile = path.join(templateDir, '/eicrud.config.service.ts');
        
        let configContent = fs.readFileSync(configTemplateFile, 'utf8');
        for(const key in keys) {
            const value = keys[key];
            configContent = configContent.replace(new RegExp(key, 'g'), value);
        }

        fs.writeFileSync(configPath, configContent);
        console.log('CREATED:', configPath);

        const rolesTemplateFile = path.join(templateDir, '/roles.ts');
        const rolesPath = './src/roles.ts';
        fs.copyFileSync(rolesTemplateFile, rolesPath);
        console.log('CREATED:', rolesPath);

        Generate.service('user');
        Generate.service('email', { nonCrud: true });

        const userServicePath = './src/services/user/user.service.ts';
        let userServiceContent = fs.readFileSync(userServicePath, 'utf8');

        const userServiceImports = [
            "import { CrudUserService } from '@eicrud/core/config'",
        ]

        userServiceContent = userServiceImports.join('\n') + '\n' + userServiceContent
        userServiceContent = userServiceContent.replace('CrudService<User>', 'CrudUserService<User>');
        
        fs.writeFileSync(userServicePath, userServiceContent);
        console.log('UPDATED:', userServicePath);

        const userTemplateFile = path.join(templateDir, '/user.ts');
        const userPath = './src/services/user/user.entity.ts';
        fs.copyFileSync(userTemplateFile, userPath);
        console.log('UPDATED:', userPath);

        child_process.execSync('npm install ' + packages.join(' '), {stdio: 'inherit'}) 

        return null;
    }

}