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

        const dir = `./services/${name}`;
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        //copy cli/templates/service files to new dir
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

            //replace content
            let content = fs.readFileSync(targetPath, 'utf8');
            for(const key in keys) {
                const value = keys[key];
                content = content.replace(new RegExp(key, 'g'), value);
            }
            //write content
            fs.writeFileSync(targetPath, content);

        });

        return Promise.resolve();
    }
    
}