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

  static removeDeletedLines(result) {
    const lineBreak = result.includes('\r\n') ? '\r\n' : '\n';
    result = result
      .split(lineBreak)
      .filter((line) => !line.includes('//delete-this-line'))
      .join(lineBreak);
    return result;
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
        `import { ${keys.tk_cmd_camel_name}Security } from './cmds/${keys.tk_cmd_lname}/${keys.tk_cmd_lname}.security';`,
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
            const newLine = `    ${keys.tk_cmd_name}: ${keys.tk_cmd_camel_name}Security,`;
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

  static splitAndAddTemplateContent(
    fs,
    path,
    defTemplateFile,
    keys,
    servicePath,
    serviceFileContent,
    importLine,
    pattern = 'GENERATED START',
    opts = { noWrite: false, noNewLine: false, mute: false },
  ) {
    const regex = new RegExp(pattern + '(.*)');
    const [before, rest, after] = serviceFileContent.split(regex);

    let defContent = fs.readFileSync(defTemplateFile, 'utf8');
    for (const key in keys) {
      const value = keys[key];
      defContent = defContent.replace(new RegExp(key, 'g'), value);
    }

    const newLine = '\n';
    const ifNewLine = opts?.noNewLine ? '' : newLine;

    serviceFileContent =
      importLine +
      (importLine ? newLine : '') +
      before +
      pattern +
      rest +
      newLine +
      defContent +
      ifNewLine +
      after;

    if (!opts?.noWrite) {
      //write content
      fs.writeFileSync(servicePath, serviceFileContent);
      if (!opts?.mute) {
        console.log('UPDATED:', servicePath);
      }
    }
    return serviceFileContent;
  }

  static removeEnclosedContent(
    fileContent: string,
    beforeString: string,
    afterString: string,
  ): string {
    const regex = new RegExp(
      beforeString + '[\\s\\S]*?' + afterString + '.*',
      'gm',
    );
    return fileContent.replace(regex, '');
  }

  static removeLineAfterMarker(fileContent: string, marker: string): string {
    const afterRegex = '.*[\\r\\n]+([^\\r\\n]+)';
    const nextLineRegex = new RegExp(marker + afterRegex, 'gm');
    return fileContent.replaceAll(nextLineRegex, '');
  }

  normalizeLineEndings(text) {
    const originalLineBreak = text.includes('\r\n') ? '\r\n' : '\n';
    if (originalLineBreak === '\r\n') {
      text = text.replaceAll('\r\n', '\n');
      text = text.replaceAll('\n', '\r\n');
    }
    return text;
  }
}
