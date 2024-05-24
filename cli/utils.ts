


export class _utils_cli {
        
    static addNewLineToMatched(content, regex, getReplaceString, errorMsg){
        //add service to array
        const match = regex.exec(content);
        if (match) {
            const array = match[1];
            content = content.replace(regex, getReplaceString(array));
        }else{
            throw new Error(errorMsg);
        }
        return content;
    }

}
