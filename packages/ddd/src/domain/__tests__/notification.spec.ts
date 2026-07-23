import { Notification } from '../notification';

describe('Notification', () => {
  it('starts without errors', () => {
    expect(new Notification().hasErrors()).toBe(false);
  });

  it('accumulates field errors without duplicates', () => {
    const notification = new Notification();
    notification.addError('name is required', 'name');
    notification.addError('name is required', 'name');
    notification.addError('name is too long', 'name');
    expect(notification.toJSON()).toEqual([{ name: ['name is required', 'name is too long'] }]);
  });

  it('stores general errors as plain strings', () => {
    const notification = new Notification();
    notification.addError('something went wrong');
    expect(notification.toJSON()).toEqual(['something went wrong']);
  });

  it('copies errors from another notification', () => {
    const source = new Notification();
    source.addError('priority is invalid', 'priority');
    const target = new Notification();
    target.copyErrors(source);
    expect(target.toJSON()).toEqual([{ priority: ['priority is invalid'] }]);
  });
});
