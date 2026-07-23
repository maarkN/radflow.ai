export type NotificationErrors = Map<string, string[] | string>;

export class Notification {
  private errors: NotificationErrors = new Map();

  addError(error: string, field?: string): void {
    if (!field) {
      this.errors.set(error, error);
      return;
    }
    const current = (this.errors.get(field) as string[] | undefined) ?? [];
    if (!current.includes(error)) {
      current.push(error);
    }
    this.errors.set(field, current);
  }

  setError(error: string | string[], field?: string): void {
    if (field) {
      this.errors.set(field, Array.isArray(error) ? error : [error]);
      return;
    }
    for (const message of Array.isArray(error) ? error : [error]) {
      this.errors.set(message, message);
    }
  }

  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  copyErrors(notification: Notification): void {
    for (const [field, value] of notification.errors.entries()) {
      this.setError(value, typeof value === 'string' ? undefined : field);
    }
  }

  toJSON(): Array<string | Record<string, string[]>> {
    const result: Array<string | Record<string, string[]>> = [];
    for (const [key, value] of this.errors.entries()) {
      if (typeof value === 'string') {
        result.push(value);
      } else {
        result.push({ [key]: value });
      }
    }
    return result;
  }
}
