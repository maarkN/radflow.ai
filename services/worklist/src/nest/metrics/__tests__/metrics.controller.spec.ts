import { MetricsController } from '../metrics.controller';
import type {
  IWorklistStatsQuery,
  WorklistStats,
} from '../../../core/study/application/queries/worklist-stats.query';

const stats: WorklistStats = {
  queueByStatus: { unread: 4, in_progress: 2, dictated: 1, signed: 7 },
  slaAtRiskCount: 3,
  slaBreachedCount: 1,
  avgTurnaroundMinutes: 42.5,
  orderedLastHour: 5,
  signedLastHour: 2,
};

const queryStub: IWorklistStatsQuery = {
  execute: jest.fn().mockResolvedValue(stats),
};

describe('MetricsController', () => {
  it('renders the KPIs in Prometheus text format', async () => {
    const body = await new MetricsController(queryStub).metrics();

    expect(body).toContain('radflow_worklist_queue_total{status="unread"} 4');
    expect(body).toContain('radflow_worklist_queue_total{status="signed"} 7');
    expect(body).toContain('radflow_worklist_sla_at_risk_total 3');
    expect(body).toContain('radflow_worklist_sla_breached_total 1');
    expect(body).toContain('radflow_worklist_turnaround_minutes 42.5');
    expect(body).toContain('radflow_worklist_ordered_last_hour_total 5');
    expect(body).toContain('radflow_worklist_signed_last_hour_total 2');
    expect(body.endsWith('\n')).toBe(true);
  });

  it('renders NaN when no study was ever signed', async () => {
    const body = await new MetricsController({
      execute: jest.fn().mockResolvedValue({ ...stats, avgTurnaroundMinutes: null }),
    }).metrics();

    expect(body).toContain('radflow_worklist_turnaround_minutes NaN');
  });
});
