import { BadRequestException } from "@nestjs/common";
import { CrudConfigService } from "../crud.config.service";
import { ICrudTransformOptions } from "./decorators";
import { CrudContext } from "../model/CrudContext";
import { IsEmail, IsOptional, IsString, MaxLength, validateOrReject } from 'class-validator';

export const crudClassMetadataMap: Record<string, Record<string, IFieldMetadata>> = {};

export interface IFieldMetadata {
    transforms: {func:((value: any) => any), opts: ICrudTransformOptions}[],
    type?: { class: any, opts?: ICrudTransformOptions },
    maxSize?: number,  
    addMaxSizePerTrustPoint?: number,
    maxLength?: number,
    addMaxLengthPerTrustPoint?: number,
    delete?: boolean
}

export interface CrudTransformerConfig {

    DEFAULT_MAX_LENGTH: number,
    DEFAULT_MAX_SIZE: number,
    checkMissingProperties?: boolean

}

export class CrudTransformer {


    constructor(private readonly crudConfig?: CrudConfigService, private ctx?: CrudContext, protected config?: CrudTransformerConfig) {
    }
    
    async validateOrReject(obj, skipMissingProperties, label) {
        try {
            await validateOrReject(obj, {
                stopAtFirstError: true,
                skipMissingProperties,
            });
        } catch (errors) {
            const msg = label + ' ' + errors.toString();
            throw new BadRequestException("Validation error " + msg);
        }
    }

    async transformTypes(obj: any, cls: any, checkSize = false) {
        return await this.transform(obj, cls, true, checkSize);
    }

    async transform(obj: any, cls: any, convertTypes = false, checkSize = false) {
        const classKey =  CrudTransformer.subGetClassKey(cls);

        const metadata = crudClassMetadataMap[classKey];
        if(!metadata) return obj;
        
        for (const key in obj) {
            const field_metadata = metadata[key] || { transforms: []};
                if(field_metadata.delete){
                    delete obj[key];
                    continue;
                }
                if(!convertTypes){
                    field_metadata.transforms.forEach((transform) => {
                        if(Array.isArray(obj[key]) && transform.opts?.each) {
                            obj[key] = obj[key].map((value: any) => transform.func(value));
                        }
                        else{
                            obj[key] = transform.func(obj[key]);
                        }
                    });
                }
                const type = field_metadata.type;
                if(type) {
                    if(Array.isArray(obj[key]) && checkSize){
                        const length = obj[key].length;
                        let maxLength = field_metadata.maxLength || this.crudConfig?.validationOptions.DEFAULT_MAX_LENGTH || this.config.DEFAULT_MAX_LENGTH;
                        let add = field_metadata.addMaxLengthPerTrustPoint || 0;
                        if (add && this.ctx && this.crudConfig) {
                            const trust = (await this.crudConfig.userService.$getOrComputeTrust(this.ctx.user, this.ctx));
                            if(trust >= 1){
                                maxLength += add * trust;
                            }
                        }
                        if ((length > maxLength)) {
                            throw new BadRequestException(`Array ${key} length is too big (max: ${maxLength})`);
                        }
                    }
                    if(Array.isArray(obj[key])) {
                        obj[key] = await Promise.all(obj[key].map(async (value: any) => {
                            const res = await this.transform(value, type.class, convertTypes, checkSize);
                            if(convertTypes){
                                Object.setPrototypeOf(res, type.class.prototype);
                            }
                            return res;
                        }));
                    }else{
                        obj[key] = await this.transform(obj[key], type.class, convertTypes, checkSize);
                        if(convertTypes){
                            Object.setPrototypeOf(obj[key], type.class.prototype);
                        }
                    }
                }else if (checkSize){
                    const entitySize = JSON.stringify(obj[key]).length;
                    let maxSize = field_metadata.maxSize || this.crudConfig?.validationOptions.DEFAULT_MAX_SIZE || this.config.DEFAULT_MAX_SIZE;
                    if(maxSize > 0){
                        let add = field_metadata.addMaxSizePerTrustPoint || 0;
                        if (add && this.ctx && this.crudConfig) {
                            const trust = (await this.crudConfig.userService.$getOrComputeTrust(this.ctx.user, this.ctx));
                            add = add * trust;
                            maxSize += Math.max(add, 0);;
                        }
                        if ((entitySize > maxSize)) {
                            throw new BadRequestException(`Field ${key} size is too big (max: ${maxSize})`);
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

    static getCrudMetadataMap() {
        return crudClassMetadataMap;
    }
    
    static getClassKey(target: any) {
        return CrudTransformer.subGetClassKey(target.constructor);
    }

    static subGetClassKey(target: any) {
        return target.name + '_' + CrudTransformer.hashClass(target);
    }
    
    static getClassMetadata(target: any): Record<string, IFieldMetadata> {
        const classKey = CrudTransformer.getClassKey(target);
        return crudClassMetadataMap[classKey];
    }

    static getFieldMetadata(target: any, propertyKey: string): IFieldMetadata {
        const classKey = CrudTransformer.getClassKey(target);
        return crudClassMetadataMap[classKey]?.[propertyKey];
    }
    
    static getOrCreateFieldMetadata(target: any, propertyKey: string): IFieldMetadata {
        const classKey = CrudTransformer.getClassKey(target);
        if (!crudClassMetadataMap[classKey]) {
            crudClassMetadataMap[classKey] = {};
        }
        if (!crudClassMetadataMap[classKey][propertyKey]) {
            crudClassMetadataMap[classKey][propertyKey] = {
                transforms: []
            };
        }
        return crudClassMetadataMap[classKey][propertyKey];
    }
    
    static setFieldMetadata(target: any, propertyKey: string, metadata: IFieldMetadata) {
        const classKey = CrudTransformer.getClassKey(target);
        crudClassMetadataMap[classKey][propertyKey] = metadata;
    }
}
