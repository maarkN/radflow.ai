const LABELS: Record<string, string> = {
  stat: 'STAT',
  urgent: 'Urgent',
  routine: 'Routine',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge badge-${priority}`}>{LABELS[priority] ?? priority}</span>;
}
