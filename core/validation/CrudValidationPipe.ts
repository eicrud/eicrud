import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { CrudConfigService } from "../config/crud.config.service";
import { CrudTransformer, CrudTransformerConfig } from "./CrudTransformer";


@Injectable()
export class CrudValidationPipe implements PipeTransform<any> {
    
    
    transformConfig: CrudTransformerConfig = {
        DEFAULT_MAX_LENGTH: 20,
        DEFAULT_MAX_SIZE: 50
    }

    constructor(transformConfig?: CrudTransformerConfig) {
        this.transformConfig = {...this.transformConfig, ...(transformConfig||{})};
    }
        
    async transform(value: any, metadata: ArgumentMetadata) {
        const crudTransformer = new CrudTransformer(null, null, this.transformConfig);
        const dataClass = metadata.metatype;
        if (dataClass) {
            value = await crudTransformer.transform(value, dataClass);
            if(!this.transformConfig.skipValidation){
                const newObj = { ...value };
                await crudTransformer.transformTypes(newObj, dataClass);
                Object.setPrototypeOf(newObj, dataClass.prototype);
                await crudTransformer.validateOrReject(newObj, !this.transformConfig.checkMissingProperties, 'Data:');
            }
        }
        return value;
    }

};