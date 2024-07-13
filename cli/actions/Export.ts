import { _utils_cli } from '../utils.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { Setup } from './Setup.js';
import { toKebabCase } from '@eicrud/shared/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Export {
  static action(type, name, cmd): Promise<any> {
    const opts = (this as any).opts();
    switch (type) {
      case 'dtos':
        return Export.dtos(opts);
      case 'superclient':
        return Export.superclient(name, opts);
      default:
        return Promise.resolve();
    }
  }

  static superclient(name, options?): Promise<any> {
    //console.log('Generating service', name);

    return Promise.resolve();
  }

  static async dtos(options?): Promise<any> {
    //console.log('Generating service', name);
    const src = path.join('./src/services');
    const dest = path.join('./exported_dtos');
    const conditionFun = (str) =>
      str.endsWith('.dto.ts') || str.endsWith('.entity.ts');
    // delete dest recursively
    if (fs.existsSync(dest)) {
      fs.rmdirSync(dest, { recursive: true });
    }
    const copiedFiles = copyDirectory(src, dest, conditionFun);
    Export.removeDecoratorsFromFiles(copiedFiles, '@mikro-orm');

    if (options?.removeValidators) {
      Export.removeDecoratorsFromFiles(copiedFiles, 'class-validator');
    }
  }

  static removeDecoratorsFromFiles(files, library) {
    const libraryRegexStr = `import[\\s\\S]*{([\\s\\S]+)}[\\s\\S]+${library}.+;`;
    //console.log('libraryRegexStr', libraryRegexStr);
    const libraryRegex = new RegExp(libraryRegexStr, 'gm');
    // loop through all files in the exported_dtos directory
    for (const filePath of files) {
      const data = fs.readFileSync(filePath, 'utf8');

      const match = libraryRegex.exec(data);
      const group1 = match ? match[1] : '';
      const imports = group1.split(',').map((str) => str.trim());
      // replace mikro-orm imports
      let result = data.replace(libraryRegex, '');
      const decoratorRegexStr = '@XXX\\([^\\)]*\\)$';
      for (const imp of imports) {
        if (!imp) continue;
        const replaced = decoratorRegexStr.replace('XXX', imp);
        //console.log('replaced', replaced);

        const decoratorRegex = new RegExp(replaced, 'gm');
        result = result.replace(decoratorRegex, '//delete-this-line');

        // get current system line break
        const lineBreak = result.includes('\r\n') ? '\r\n' : '\n';
        result = result
          .split(lineBreak)
          .filter((line) => !line.includes('//delete-this-line'))
          .join(lineBreak);
      }
      fs.writeFileSync(filePath, result, 'utf8');
    }
  }
}

// Recursively copy files that end with the specific string
const copyDirectory = (src, dest, conditionFun: (str: string) => boolean) => {
  // Ensure destination directory exists
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const copiedFiles = [];

  // Read all items in the source directory
  const items = fs.readdirSync(src);

  items.forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      // If item is a directory, recurse
      copiedFiles.push(...copyDirectory(srcPath, destPath, conditionFun));
    } else {
      // If item is a file, check if it ends with the specific string
      if (conditionFun(item)) {
        fs.copyFileSync(srcPath, destPath);
        copiedFiles.push(destPath);
      }
    }
  });

  return copiedFiles;
};
