import type { Notification } from '../../domain/notification';

type Expected = { notification: Notification };
type FieldsErrors = Array<string | Record<string, string[]>>;

expect.extend({
  toContainNotificationErrors(expected: Expected, errors: FieldsErrors) {
    const json = expected.notification.toJSON();
    const every = errors.every((error) => {
      if (typeof error === 'string') {
        return json.includes(error);
      }
      return Object.entries(error).every(([field, messages]) => {
        const fieldErrors = json.find(
          (item): item is Record<string, string[]> => typeof item === 'object' && field in item,
        );
        return (
          fieldErrors !== undefined &&
          messages.every((message) => fieldErrors[field]?.includes(message))
        );
      });
    });
    return every
      ? { pass: true, message: () => 'notification contains the expected errors' }
      : {
          pass: false,
          message: () =>
            `notification does not contain ${JSON.stringify(errors)}. ` +
            `Current: ${JSON.stringify(json)}`,
        };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toContainNotificationErrors(errors: Array<string | Record<string, string[]>>): R;
    }
  }
}

export {};
