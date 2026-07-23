import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getWorklistStats } from '../../lib/api';
import { getSocket } from '../../lib/socket';

const STATUS_LABELS: Record<string, string> = {
  unread: 'Unread',
  in_progress: 'In progress',
  dictated: 'Dictated',
  signed: 'Signed',
};

export function StatsPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['worklist-stats'],
    queryFn: getWorklistStats,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const socket = getSocket();
    const invalidate = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['worklist-stats'] });
    };
    socket.on('study.event', invalidate);
    return () => {
      socket.off('study.event', invalidate);
    };
  }, [queryClient]);

  if (query.isLoading) {
    return <p className="empty-state">Loading metrics…</p>;
  }
  if (query.isError || !query.data) {
    return <p className="alert">Could not load worklist metrics.</p>;
  }

  const stats = query.data;
  return (
    <section aria-label="Worklist metrics" className="stats-panel">
      <h2>Operations</h2>
      <div className="stats-grid">
        {Object.entries(stats.queueByStatus).map(([status, count]) => (
          <article key={status} className="stat-card">
            <span className="stat-value">{count}</span>
            <span className="stat-label">{STATUS_LABELS[status] ?? status}</span>
          </article>
        ))}
        <article className={`stat-card${stats.slaAtRiskCount > 0 ? ' warning' : ''}`}>
          <span className="stat-value">{stats.slaAtRiskCount}</span>
          <span className="stat-label">SLA at risk</span>
        </article>
        <article className={`stat-card${stats.slaBreachedCount > 0 ? ' danger' : ''}`}>
          <span className="stat-value">{stats.slaBreachedCount}</span>
          <span className="stat-label">SLA breached</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">
            {stats.avgTurnaroundMinutes == null ? '—' : `${stats.avgTurnaroundMinutes}m`}
          </span>
          <span className="stat-label">Avg turnaround</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">
            {stats.orderedLastHour} / {stats.signedLastHour}
          </span>
          <span className="stat-label">Ordered / signed last hour</span>
        </article>
      </div>
    </section>
  );
}
