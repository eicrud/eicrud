export class _utils_cli {
  static addNewLineToMatched(content, regex, getReplaceString, errorMsg) {
    //add service to array
    const match = regex.exec(content);
    if (match) {
      const array = match[1];
      content = content.replace(regex, getReplaceString(array));
    } else {
      throw new Error(errorMsg);
    }
    return content;
  }

  static writeImportsAndReplacesToFile(importLines, replaces, file, fs) {
    let content = fs.readFileSync(file, 'utf8');

    importLines.forEach((importLine) => {
      content = importLine + '\n' + content;
    });

    for (let replace of replaces) {
      content = _utils_cli.addNewLineToMatched(
        content,
        replace.regex,
        replace.getReplaceString,
        replace.error,
      );
    }

    //write content
    fs.writeFileSync(file, content);

    console.log('UPDATED:', file);
  }

  static createCmdsFile(fs, path, template_folder, dir) {
    const cmdsFile = dir + `/cmds.ts`;
    if (!fs.existsSync(cmdsFile)) {
      const templateIndex = path.join(template_folder, '/service/cmds.ts');
      fs.copyFileSync(templateIndex, cmdsFile);
      console.log('CREATED:', cmdsFile);
    }
    return cmdsFile;
  }

  static addSecurityToCmdIndex(
    fs,
    path,
    template_folder,
    serviceName,
    keysArray,
  ) {
    const dir = `./src/services/${serviceName}`;
    const cmdsFile = _utils_cli.createCmdsFile(fs, path, template_folder, dir);

    let importLines = [];

    for (const keys of keysArray) {
      importLines = [
        ...importLines,
        `import { ${keys.tk_cmd_bname}Security } from './cmds/${keys.tk_cmd_lname}/${keys.tk_cmd_lname}.security';`,
      ];
    }

    let content = fs.readFileSync(cmdsFile, 'utf8');

    importLines.forEach((importLine) => {
      content = importLine + '\n' + content;
    });

    for (const keys of keysArray) {
      const replaces = [
        {
          regex:
            /export[ ]{1,}const[ ]{1,}serviceCmds[ ]{1,}=[ ]{1,}\{([^\}]*)\}/,
          getReplaceString: (array) => {
            const newLine = `    ${keys.tk_cmd_name}: ${keys.tk_cmd_bname}Security,`;
            let rep = array.trim();
            rep = rep ? '    ' + rep + '\n' : '';
            return `export const serviceCmds =  {\n${newLine}\n${rep}}`;
          },
          error: 'Could not find serviceCmds array in cmds file',
        },
      ];

      for (let replace of replaces) {
        content = _utils_cli.addNewLineToMatched(
          content,
          replace.regex,
          replace.getReplaceString,
          replace.error,
        );
      }
    }

    //write content
    fs.writeFileSync(cmdsFile, content);

    console.log('UPDATED:', cmdsFile);
  }
}
