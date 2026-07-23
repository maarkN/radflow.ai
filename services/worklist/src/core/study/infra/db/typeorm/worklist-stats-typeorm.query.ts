import type { DataSource } from 'typeorm';
import type { StudyStatus } from '@radflow/shared';
import {
  SLA_RISK_WINDOW_MINUTES,
  type IWorklistStatsQuery,
  type WorklistStats,
} from '../../../application/queries/worklist-stats.query';
import { StudyModel } from './study.model';

const OPEN_STATUSES: StudyStatus[] = ['unread', 'in_progress'];

/**
 * Read model over the studies table. Turnaround uses updated_at of signed
 * studies as the sign timestamp (the aggregate does not store signedAt).
 */
export class WorklistStatsTypeOrmQuery implements IWorklistStatsQuery {
  constructor(private readonly dataSource: DataSource) {}

  async execute(now: Date = new Date()): Promise<WorklistStats> {
    const repository = this.dataSource.getRepository(StudyModel);
    const riskHorizon = new Date(now.getTime() + SLA_RISK_WINDOW_MINUTES * 60_000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60_000);

    const statusRows = await repository
      .createQueryBuilder('model')
      .select('model.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('model.status')
      .getRawMany<{ status: StudyStatus; total: string }>();

    const queueByStatus: WorklistStats['queueByStatus'] = {
      unread: 0,
      in_progress: 0,
      dictated: 0,
      signed: 0,
    };
    for (const row of statusRows) {
      queueByStatus[row.status] = Number(row.total);
    }

    const [slaAtRiskCount, slaBreachedCount, orderedLastHour, signedLastHour] = await Promise.all([
      repository
        .createQueryBuilder('model')
        .where('model.status IN (:...open)', { open: OPEN_STATUSES })
        .andWhere('model.sla_deadline <= :riskHorizon', { riskHorizon })
        .getCount(),
      repository
        .createQueryBuilder('model')
        .where('model.status IN (:...open)', { open: OPEN_STATUSES })
        .andWhere('model.sla_deadline <= :now', { now })
        .getCount(),
      repository
        .createQueryBuilder('model')
        .where('model.ordered_at >= :oneHourAgo', { oneHourAgo })
        .getCount(),
      repository
        .createQueryBuilder('model')
        .where('model.status = :signed', { signed: 'signed' })
        .andWhere('model.updated_at >= :oneHourAgo', { oneHourAgo })
        .getCount(),
    ]);

    const turnaround = await repository
      .createQueryBuilder('model')
      .select('AVG(EXTRACT(EPOCH FROM (model.updated_at - model.ordered_at)) / 60)', 'minutes')
      .where('model.status = :signed', { signed: 'signed' })
      .getRawOne<{ minutes: string | null }>();

    return {
      queueByStatus,
      slaAtRiskCount,
      slaBreachedCount,
      avgTurnaroundMinutes:
        turnaround?.minutes == null ? null : Math.round(Number(turnaround.minutes) * 10) / 10,
      orderedLastHour,
      signedLastHour,
    };
  }
}
