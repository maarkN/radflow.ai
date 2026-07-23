import { CriticalFindingsFeed } from '../features/admin/critical-findings-feed';
import { StatsPanel } from '../features/admin/stats-panel';

export function AdminPage() {
  return (
    <section>
      <h1>Admin dashboard</h1>
      <StatsPanel />
      <CriticalFindingsFeed />
    </section>
  );
}
