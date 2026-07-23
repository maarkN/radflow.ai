export class ConcurrencyError extends Error {
  constructor(entityName: string, id: string) {
    super(`${entityName} ${id} was modified by another operation; reload and retry`);
    this.name = 'ConcurrencyError';
  }
}
