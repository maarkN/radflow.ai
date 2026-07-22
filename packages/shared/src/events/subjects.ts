export const Subjects = {
  StudyOrdered: 'radflow.study.ordered',
  StudyClaimed: 'radflow.study.claimed',
  StudyReleased: 'radflow.study.released',
  StudyDictated: 'radflow.study.dictated',
  StudySigned: 'radflow.study.signed',
  StudyCriticalFinding: 'radflow.study.critical_finding',
  ReportDraftRequested: 'radflow.report.draft_requested',
  ReportDraftReady: 'radflow.report.draft_ready',
} as const;

export type Subject = (typeof Subjects)[keyof typeof Subjects];
