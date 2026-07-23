export class NotFoundError extends Error {
  constructor(id: unknown, entityClass: { name: string }) {
    super(`${entityClass.name} not found using ID ${String(id)}`);
    this.name = 'NotFoundError';
  }
}
