import type { StudyStatus } from '@radflow/shared';

export type WorklistStats = {
  queueByStatus: Record<StudyStatus, number>;
  /** Open studies (unread/in_progress) whose SLA deadline is past or within the risk window. */
  slaAtRiskCount: number;
  /** Open studies whose SLA deadline has already passed. */
  slaBreachedCount: number;
  /** Average ordered→signed time of signed studies, in minutes. Null when nothing is signed. */
  avgTurnaroundMinutes: number | null;
  orderedLastHour: number;
  signedLastHour: number;
};

export const SLA_RISK_WINDOW_MINUTES = 15;

export interface IWorklistStatsQuery {
  execute(now?: Date): Promise<WorklistStats>;
}
