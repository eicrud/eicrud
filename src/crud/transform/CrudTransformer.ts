import { ICrudTransformOptions } from "./decorators";

export const _crudClassMetadataMap: Record<string, Record<string, IFieldMetadata>> = {};

export interface IFieldMetadata {
    transforms: {func:((value: any) => any), opts: ICrudTransformOptions}[],
    type?: { class: any, opts?: ICrudTransformOptions }
}

export class CrudTransformer {

    static transformCrud(obj: any, cls: any) {
        const metadata = CrudTransformer.getClassMetadata(cls);
        if(!metadata) return obj;
        
        for (const key in obj) {
            if (metadata[key]) {

                metadata[key].transforms.forEach((transform) => {
                    if(Array.isArray(obj[key]) && transform.opts?.each) {
                        obj[key] = obj[key].map((value: any) => transform.func(value));
                    }
                    else{
                        obj[key] = transform.func(obj[key]);
                    }
                });
                const type = metadata[key].type;
                if(type) {
                    if(Array.isArray(obj[key]) && type.opts?.each) {
                        obj[key] = obj[key].map((value: any) => {
                            const res = CrudTransformer.transformCrud(value, type.class);
                            Object.setPrototypeOf(value, type.class.prototype);
                            return res;
                        });
                    }else{
                        obj[key] = CrudTransformer.transformCrud(obj[key], type.class);
                        Object.setPrototypeOf(obj[key],type.class.prototype);
                    }
                }

            }
        }
        return obj;
    }
    
    
    static hashString(s: string) {
        let hash = 0;
        if (s.length == 0) return hash;
        for (let i = 0; i < s.length; i++) {
            let char = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
    
    static hashClass(classObj: Function) {
        // Convert the class to a string and hash the string
        const classHash = CrudTransformer.hashString(classObj.toString());
        return classHash;
    }
    
    static getClassKey(target: any) {
        return target.constructor.name + '_' + CrudTransformer.hashClass(target.constructor);
    }
    
    static getClassMetadata(target: any): Record<string, IFieldMetadata> {
        const classKey = CrudTransformer.getClassKey(target);
        return _crudClassMetadataMap[classKey];
    }

    static getFieldMetadata(target: any, propertyKey: string): IFieldMetadata {
        const classKey = CrudTransformer.getClassKey(target);
        return _crudClassMetadataMap[classKey]?.[propertyKey];
    }
    
    static getOrCreateFieldMetadata(target: any, propertyKey: string): IFieldMetadata {
        const classKey = CrudTransformer.getClassKey(target);
        if (!_crudClassMetadataMap[classKey]) {
            _crudClassMetadataMap[classKey] = {};
        }
        if (!_crudClassMetadataMap[classKey][propertyKey]) {
            _crudClassMetadataMap[classKey][propertyKey] = {
                transforms: []
            };
        }
        return _crudClassMetadataMap[classKey][propertyKey];
    }
    
    static setFieldMetadata(target: any, propertyKey: string, metadata: IFieldMetadata) {
        const classKey = CrudTransformer.getClassKey(target);
        _crudClassMetadataMap[classKey][propertyKey] = metadata;
    }
}
