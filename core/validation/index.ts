export * from './decorators';
export * from './CrudValidationPipe';

export class ValidationOptions {
  defaultMaxSize = 50;
  defaultMaxLength = 20;
  defaultMaxItemsPerUser = 0;
  batchValidationYieldRate = 300;
}
