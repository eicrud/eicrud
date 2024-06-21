export * from './decorators';
export * from './CrudValidationPipe';

export class ValidationOptions {
  defaultMaxSize = 50;
  defaultMaxArLength = 20;
  defaultMaxItemsPerUser = 0;
  batchValidationYieldRate = 300;
}
