import { Notification } from './notification';
import type { ValueObject } from './value-object';

export abstract class Entity {
  readonly notification: Notification = new Notification();

  abstract get entityId(): ValueObject;

  abstract toJSON(): Record<string, unknown>;
}
