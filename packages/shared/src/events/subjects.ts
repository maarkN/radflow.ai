export const Subjects = {
  StudyOrdered: 'radflow.study.ordered',
  StudyClaimed: 'radflow.study.claimed',
  StudyReleased: 'radflow.study.released',
  StudyDictated: 'radflow.study.dictated',
  StudySigned: 'radflow.study.signed',
  StudyCriticalFinding: 'radflow.study.critical_finding',
  ReportDraftRequested: 'radflow.report.draft_requested',
  ReportDraftReady: 'radflow.report.draft_ready',
  Hl7OrmReceived: 'radflow.hl7.orm_received',
} as const;

export type Subject = (typeof Subjects)[keyof typeof Subjects];

/** Poison messages are parked under this prefix after max deliveries. */
export const DLQ_PREFIX = 'radflow.dlq.';

export function dlqSubjectFor(subject: string): string {
  return `${DLQ_PREFIX}${subject}`;
}
