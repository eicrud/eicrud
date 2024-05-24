import { _utils_cli } from "../utils";

const fs = require('fs');

export class Generate {
    
    static action(type, name): Promise<any> {
        switch (type) {
            case 'app':
                return Generate.app(name);
            case 'service':
                return Generate.service(name);
            default:
                return Promise.resolve();
        }
    }

    static app(name): Promise<any> {
        return Promise.resolve();
    }

    static service(name): Promise<any> {
  
        //console.log('Generating service', name);

        name = name.charAt(0).toUpperCase() + name.slice(1);

        const keys = {
            tk_entity_name: name,
            tk_entity_lname: name.toLowerCase(),
            tk_entity_uname: name.toUpperCase()
        }

        const dir = `./src/services/${name}`;
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        const template_folder = 'cli/templates/service';
        const files = ['tk_entity_name.ts', 'tk_entity_lname.security.ts', 'tk_entity_lname.service.ts'];

        files.forEach(file => {
            const sourcePath = `${template_folder}/${file}`;
            let newFileName = file;
            for(const key in keys) {
                const value = keys[key];
                newFileName = newFileName.replace(key, value);
            }
            const targetPath = `${dir}/${newFileName}`;
            fs.copyFileSync(sourcePath, targetPath);
            console.log('CREATED:', targetPath);

            //replace content
            let content = fs.readFileSync(targetPath, 'utf8');
            for(const key in keys) {
                const value = keys[key];
                content = content.replace(new RegExp(key, 'g'), value);
            }
            //write content
            fs.writeFileSync(targetPath, content);

        });


        const indexFile = `./src/services/index.ts`;
        if (!fs.existsSync(indexFile)){
            const templateIndex = `${template_folder}/index.ts`;
            fs.copyFileSync(templateIndex, indexFile);
        }

        const serviceName = `${name}Service`;
        const importLines = [
            `import { ${serviceName} } from './${keys.tk_entity_lname}/${keys.tk_entity_lname}.service';`,
            `import { ${name} } from './${keys.tk_entity_lname}/${name}';`,
        ];

        //update index file
        let content = fs.readFileSync(indexFile, 'utf8');

        importLines.forEach(importLine => {
            content = importLine + '\n' + content;
        });

        const replaces = [
            {
                regex: /export[ ]{1,}const[ ]{1,}CRUDServices[ ]{1,}=[ ]{1,}\[([^\]]*)\]/,
                getReplaceString: (array) => {
                    let rep = array.trim()
                    rep = rep ? '    ' + rep + '\n' : ''
                    return `export const CRUDServices = [\n    ${serviceName},\n${rep}]`;
                },
                error: 'Could not find CRUDServices array in index file'
            },     
            {
                regex: /export[ ]{1,}const[ ]{1,}CRUDEntities[ ]{1,}=[ ]{1,}\[([^\]]*)\]/,
                getReplaceString: (array) => {
                    let rep = array.trim()
                    rep = rep ? '    ' + rep + '\n' : ''
                    return `export const CRUDEntities = [\n    ${name},\n${rep}]`;
                },
                error: 'Could not find CRUDEntities array in index file'
            },
        ]

        for(let replace of replaces) {
            content = _utils_cli.addNewLineToMatched(content, replace.regex, replace.getReplaceString, replace.error);
        }

        //write content
        fs.writeFileSync(indexFile, content);

        console.log('UPDATED:', indexFile);

        const providersFile = `./src/app.module.ts`;
        if (!fs.existsSync(providersFile)){
            throw new Error('Could not find app.module.ts');
        }  

        //update app.module.ts
        content = fs.readFileSync(providersFile, 'utf8');
        const contentlength = content.length;

        const importServicesLine = `import { CRUDServices } from './services';`;

        //add import line at beginning of file if not already there
        if (!content.includes(importServicesLine)) {
            content = importServicesLine + '\n' + content;
        }

        const crudServicesSpread = '...CRUDServices';

        if (!content.includes(crudServicesSpread)) {
            const providersRegex = /providers[ ]{0,}:[ ]{1,}\[([^\]]*)\]/;
            const newLine = `    ${crudServicesSpread},`;
            const getReplaceString = (array) => {
                let rep = array.trim()
                rep = rep ? '    ' + rep + '\n' : ''
                return `providers: [\n${newLine}\n${rep}  ]`;
            }
            content = _utils_cli.addNewLineToMatched(content, providersRegex, getReplaceString, `Could not find providers array in ${providersFile}`)
        }

        //write content
        if(content.length !== contentlength) {
            fs.writeFileSync(providersFile, content);
            console.log('UPDATED:', providersFile);
        }


        return Promise.resolve();
    }
    
}