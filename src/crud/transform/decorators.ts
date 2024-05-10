import { CrudTransformer } from "./CrudTransformer";

export interface ICrudTransformOptions {
    each?: boolean;
}

export function $Transform(opts?: ICrudTransformOptions) {
    return (target: any, propertyKey: string, func: (value: any) => any) => {
        const metadata = CrudTransformer.getOrCreateFieldMetadata(target, propertyKey);
        metadata.transforms.push({ func, opts });
        CrudTransformer.setFieldMetadata(target, propertyKey, metadata);
    }
}

export function $ToLowerCase() {
    return (target: any, propertyKey: string) => {
        $Transform({ each: true })(target, propertyKey, (value: string) => value.toLowerCase());
    }
}

export function $Trim() {
    return (target: any, propertyKey: string) => {
        $Transform({ each: true })(target, propertyKey, (value: string) => value.trim());
    }
}

export function $Type(type: any, opts?: ICrudTransformOptions) {
    return function (target: any, propertyKey: string) {
        const metadata = CrudTransformer.getOrCreateFieldMetadata(target, propertyKey);
        metadata.type = {class: type, opts};
        CrudTransformer.setFieldMetadata(target, propertyKey, metadata);
    }
}