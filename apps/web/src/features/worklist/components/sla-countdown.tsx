import { useEffect, useState } from 'react';

function format(msRemaining: number): string {
  const totalSeconds = Math.floor(Math.abs(msRemaining) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock =
    hours > 0
      ? `${hours}h ${String(minutes).padStart(2, '0')}m`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return msRemaining < 0 ? `-${clock}` : clock;
}

export function SlaCountdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = new Date(deadline).getTime() - now;
  const isOverdue = remaining < 0;
  const isAtRisk = !isOverdue && remaining < 15 * 60_000;

  return (
    <span
      className={`sla ${isOverdue ? 'sla-overdue' : isAtRisk ? 'sla-risk' : ''}`}
      title={new Date(deadline).toLocaleString()}
    >
      {format(remaining)}
      {isOverdue ? ' overdue' : ''}
    </span>
  );
}
