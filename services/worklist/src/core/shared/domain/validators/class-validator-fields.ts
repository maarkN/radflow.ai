import { validateSync } from 'class-validator';
import type { Notification } from '../notification';

export abstract class ClassValidatorFields {
  validate(notification: Notification, data: object, fields: string[]): boolean {
    const errors = validateSync(data, { groups: fields });
    for (const error of errors) {
      for (const message of Object.values(error.constraints ?? {})) {
        notification.addError(message, error.property);
      }
    }
    return errors.length === 0;
  }
}
