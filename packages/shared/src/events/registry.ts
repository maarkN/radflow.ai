import type { z } from 'zod';
import {
  reportDraftReadyEventSchema,
  reportDraftRequestedEventSchema,
} from './report.events';
import {
  studyClaimedEventSchema,
  studyCriticalFindingEventSchema,
  studyDictatedEventSchema,
  studyOrderedEventSchema,
  studyReleasedEventSchema,
  studySignedEventSchema,
} from './study.events';
import { Subjects } from './subjects';
import type { Subject } from './subjects';

/**
 * Single source of truth for consumers: given a subject, this is the schema
 * the incoming message MUST validate against before being processed.
 */
export const eventSchemaBySubject = {
  [Subjects.StudyOrdered]: studyOrderedEventSchema,
  [Subjects.StudyClaimed]: studyClaimedEventSchema,
  [Subjects.StudyReleased]: studyReleasedEventSchema,
  [Subjects.StudyDictated]: studyDictatedEventSchema,
  [Subjects.StudySigned]: studySignedEventSchema,
  [Subjects.StudyCriticalFinding]: studyCriticalFindingEventSchema,
  [Subjects.ReportDraftRequested]: reportDraftRequestedEventSchema,
  [Subjects.ReportDraftReady]: reportDraftReadyEventSchema,
} as const satisfies Record<Subject, z.ZodType>;
