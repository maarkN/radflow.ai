import type { Priority } from '@radflow/shared';

const SLA_MINUTES: Record<Priority, number> = {
  stat: 60,
  urgent: 4 * 60,
  routine: 24 * 60,
};

export const SlaPolicy = {
  deadlineFor(priority: Priority, orderedAt: Date): Date {
    return new Date(orderedAt.getTime() + SLA_MINUTES[priority] * 60_000);
  },
};
