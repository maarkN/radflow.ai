import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { IWorklistStatsQuery } from '../../core/study/application/queries/worklist-stats.query';

/**
 * Worklist KPIs in Prometheus text exposition format, computed on scrape from
 * the stats read model. Gauges only, so the format is rendered by hand instead
 * of pulling in a client library.
 */
@Controller('metrics')
export class MetricsController {
  constructor(@Inject('WorklistStatsQuery') private readonly statsQuery: IWorklistStatsQuery) {}

  // @Res direto para escapar do interceptor de envelope {data} — Prometheus
  // exige o texto puro.
  @Get()
  async metrics(@Res() response: Response): Promise<void> {
    const body = await this.render();
    response.type('text/plain; version=0.0.4; charset=utf-8').send(body);
  }

  async render(): Promise<string> {
    const stats = await this.statsQuery.execute();

    const lines: string[] = [
      '# HELP radflow_worklist_queue_total Studies currently in each status.',
      '# TYPE radflow_worklist_queue_total gauge',
      ...Object.entries(stats.queueByStatus).map(
        ([status, count]) => `radflow_worklist_queue_total{status="${status}"} ${count}`,
      ),
      '# HELP radflow_worklist_sla_at_risk_total Open studies past or within 15min of the SLA deadline.',
      '# TYPE radflow_worklist_sla_at_risk_total gauge',
      `radflow_worklist_sla_at_risk_total ${stats.slaAtRiskCount}`,
      '# HELP radflow_worklist_sla_breached_total Open studies past the SLA deadline.',
      '# TYPE radflow_worklist_sla_breached_total gauge',
      `radflow_worklist_sla_breached_total ${stats.slaBreachedCount}`,
      '# HELP radflow_worklist_turnaround_minutes Average ordered-to-signed time in minutes.',
      '# TYPE radflow_worklist_turnaround_minutes gauge',
      `radflow_worklist_turnaround_minutes ${stats.avgTurnaroundMinutes ?? 'NaN'}`,
      '# HELP radflow_worklist_ordered_last_hour_total Studies ordered in the last hour.',
      '# TYPE radflow_worklist_ordered_last_hour_total gauge',
      `radflow_worklist_ordered_last_hour_total ${stats.orderedLastHour}`,
      '# HELP radflow_worklist_signed_last_hour_total Studies signed in the last hour.',
      '# TYPE radflow_worklist_signed_last_hour_total gauge',
      `radflow_worklist_signed_last_hour_total ${stats.signedLastHour}`,
    ];
    return `${lines.join('\n')}\n`;
  }
}
