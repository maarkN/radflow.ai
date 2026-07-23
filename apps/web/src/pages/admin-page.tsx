import { CriticalFindingsFeed } from '../features/admin/critical-findings-feed';

export function AdminPage() {
  return (
    <section>
      <h1>Admin dashboard</h1>
      <CriticalFindingsFeed />
      <p className="empty-state">Queue metrics, SLA risk and turnaround time will live here.</p>
    </section>
  );
}
