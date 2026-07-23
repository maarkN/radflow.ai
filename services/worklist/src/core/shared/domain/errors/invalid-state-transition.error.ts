export class InvalidStateTransitionError extends Error {
  constructor(entityName: string, from: string, to: string) {
    super(`Invalid state transition for ${entityName}: ${from} -> ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}
