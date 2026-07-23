import { SlaPolicy } from '../sla-policy';

describe('SlaPolicy', () => {
  const orderedAt = new Date('2026-07-22T12:00:00Z');

  it.each([
    ['stat', '2026-07-22T13:00:00.000Z'],
    ['urgent', '2026-07-22T16:00:00.000Z'],
    ['routine', '2026-07-23T12:00:00.000Z'],
  ] as const)('deadline for %s priority', (priority, expected) => {
    expect(SlaPolicy.deadlineFor(priority, orderedAt).toISOString()).toBe(expected);
  });
});
