import { z } from 'zod';
import { modalitySchema, prioritySchema } from '../domain/enums';
import { eventEnvelopeSchema } from './envelope';

export const studyOrderedPayloadSchema = z.object({
  studyId: z.uuid(),
  accessionNumber: z.string().min(1),
  patientName: z.string().min(1),
  modality: modalitySchema,
  priority: prioritySchema,
  orderedAt: z.iso.datetime(),
  slaDeadline: z.iso.datetime(),
});
export type StudyOrderedPayload = z.infer<typeof studyOrderedPayloadSchema>;
export const studyOrderedEventSchema = eventEnvelopeSchema(studyOrderedPayloadSchema);

export const studyClaimedPayloadSchema = z.object({
  studyId: z.uuid(),
  radiologistId: z.uuid(),
  claimedAt: z.iso.datetime(),
});
export type StudyClaimedPayload = z.infer<typeof studyClaimedPayloadSchema>;
export const studyClaimedEventSchema = eventEnvelopeSchema(studyClaimedPayloadSchema);

export const studyReleasedPayloadSchema = z.object({
  studyId: z.uuid(),
  radiologistId: z.uuid(),
  releasedAt: z.iso.datetime(),
});
export type StudyReleasedPayload = z.infer<typeof studyReleasedPayloadSchema>;
export const studyReleasedEventSchema = eventEnvelopeSchema(studyReleasedPayloadSchema);

export const studyDictatedPayloadSchema = z.object({
  studyId: z.uuid(),
  reportId: z.uuid(),
  dictatedAt: z.iso.datetime(),
});
export type StudyDictatedPayload = z.infer<typeof studyDictatedPayloadSchema>;
export const studyDictatedEventSchema = eventEnvelopeSchema(studyDictatedPayloadSchema);

export const studySignedPayloadSchema = z.object({
  studyId: z.uuid(),
  reportId: z.uuid(),
  signedBy: z.uuid(),
  signedAt: z.iso.datetime(),
  contentHash: z.string().min(1),
});
export type StudySignedPayload = z.infer<typeof studySignedPayloadSchema>;
export const studySignedEventSchema = eventEnvelopeSchema(studySignedPayloadSchema);

export const studyCriticalFindingPayloadSchema = z.object({
  studyId: z.uuid(),
  reportId: z.uuid().optional(),
  description: z.string().min(1),
  detectedAt: z.iso.datetime(),
});
export type StudyCriticalFindingPayload = z.infer<typeof studyCriticalFindingPayloadSchema>;
export const studyCriticalFindingEventSchema = eventEnvelopeSchema(studyCriticalFindingPayloadSchema);
