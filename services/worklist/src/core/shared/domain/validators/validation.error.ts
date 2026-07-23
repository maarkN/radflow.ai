export type FieldsErrors = Array<string | Record<string, string[]>>;

export abstract class BaseValidationError extends Error {
  constructor(
    readonly errors: FieldsErrors,
    message = 'Validation Error',
  ) {
    super(message);
  }
}

export class EntityValidationError extends BaseValidationError {
  constructor(errors: FieldsErrors) {
    super(errors, 'Entity Validation Error');
    this.name = 'EntityValidationError';
  }
}

export class SearchValidationError extends BaseValidationError {
  constructor(errors: FieldsErrors) {
    super(errors, 'Search Validation Error');
    this.name = 'SearchValidationError';
  }
}

/** Thrown by DB mappers when a persisted row can no longer be rehydrated into a valid aggregate. */
export class LoadEntityError extends BaseValidationError {
  constructor(errors: FieldsErrors) {
    super(errors, 'Load Entity Error');
    this.name = 'LoadEntityError';
  }
}
