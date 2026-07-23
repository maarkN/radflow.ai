import { randomUUID } from 'node:crypto';
import { ValueObject } from '../value-object';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class Uuid extends ValueObject {
  readonly id: string;

  constructor(id?: string) {
    super();
    this.id = id ?? randomUUID();
    this.validate();
  }

  private validate(): void {
    if (!UUID_REGEX.test(this.id)) {
      throw new InvalidUuidError(this.id);
    }
  }

  override toString(): string {
    return this.id;
  }
}

export class InvalidUuidError extends Error {
  constructor(invalidValue: string) {
    super(`ID "${invalidValue}" must be a valid UUID`);
    this.name = 'InvalidUuidError';
  }
}
