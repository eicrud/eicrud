import { CrudTransformer } from "./CrudTransformer";

export interface ICrudTransformOptions {
    each?: boolean;
}

export function $Transform(func: (value) => any, opts?: ICrudTransformOptions) {
    return (target: any, propertyKey: string) => {
        const metadata = CrudTransformer.getOrCreateFieldMetadata(target, propertyKey);
        metadata.transforms.push({ func, opts });
        CrudTransformer.setFieldMetadata(target, propertyKey, metadata);
    }
}

export function $ToLowerCase() {
    return (target: any, propertyKey: string) => {
        $Transform((value: string) => value.toLowerCase(),{ each: true })(target, propertyKey);
    }
}

export function $Trim() {
    return (target: any, propertyKey: string) => {
        $Transform((value: string) => value.trim(), { each: true })(target, propertyKey);
    }
}

export function $Type(type: any, opts?: ICrudTransformOptions) {
    return function (target: any, propertyKey: string) {
        const metadata = CrudTransformer.getOrCreateFieldMetadata(target, propertyKey);
        metadata.type = {class: type, opts};
        CrudTransformer.setFieldMetadata(target, propertyKey, metadata);
    }
}

export function $MaxSize(size: number, addPerTrustPoint?: number) {
    return (target: any, propertyKey: string) => {
        const metadata = CrudTransformer.getOrCreateFieldMetadata(target, propertyKey);
        metadata.maxSize = size;
        metadata.addMaxSizePerTrustPoint = addPerTrustPoint;
        CrudTransformer.setFieldMetadata(target, propertyKey, metadata);
    }
}

export function $MaxLength(length: number, addPerTrustPoint?: number) {
    return (target: any, propertyKey: string) => {
        const metadata = CrudTransformer.getOrCreateFieldMetadata(target, propertyKey);
        metadata.maxLength = length;
        metadata.addMaxLengthPerTrustPoint = addPerTrustPoint;
        CrudTransformer.setFieldMetadata(target, propertyKey, metadata);
    }
}