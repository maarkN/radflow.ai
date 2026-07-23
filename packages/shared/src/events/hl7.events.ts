import { z } from 'zod';
import { modalitySchema, prioritySchema } from '../domain/enums';
import { eventEnvelopeSchema } from './envelope';

/**
 * Published by the integration service when an HL7 ORM^O01 (new order) is
 * received and parsed. The worklist service consumes it to create the study.
 */
export const hl7OrmReceivedPayloadSchema = z.object({
  accessionNumber: z.string().min(1).max(64),
  patientName: z.string().min(1).max(255),
  modality: modalitySchema,
  priority: prioritySchema,
  orderedAt: z.iso.datetime(),
  placerOrderNumber: z.string().optional(),
  sendingFacility: z.string().optional(),
});
export type Hl7OrmReceivedPayload = z.infer<typeof hl7OrmReceivedPayloadSchema>;
export const hl7OrmReceivedEventSchema = eventEnvelopeSchema(hl7OrmReceivedPayloadSchema);
