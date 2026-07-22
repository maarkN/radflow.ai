import { z } from 'zod';
import { eventEnvelopeSchema } from './envelope';

export const reportDraftRequestedPayloadSchema = z.object({
  studyId: z.uuid(),
  transcriptId: z.uuid(),
  transcript: z.string().min(1),
  requestedAt: z.iso.datetime(),
});
export type ReportDraftRequestedPayload = z.infer<typeof reportDraftRequestedPayloadSchema>;
export const reportDraftRequestedEventSchema = eventEnvelopeSchema(
  reportDraftRequestedPayloadSchema,
);

export const reportSectionsSchema = z.object({
  technique: z.string(),
  findings: z.string(),
  impression: z.string(),
});
export type ReportSections = z.infer<typeof reportSectionsSchema>;

export const reportDraftReadyPayloadSchema = z.object({
  studyId: z.uuid(),
  reportId: z.uuid(),
  sections: reportSectionsSchema,
  criticalFinding: z.string().nullable(),
  draftedAt: z.iso.datetime(),
});
export type ReportDraftReadyPayload = z.infer<typeof reportDraftReadyPayloadSchema>;
export const reportDraftReadyEventSchema = eventEnvelopeSchema(reportDraftReadyPayloadSchema);
