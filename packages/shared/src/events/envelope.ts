import { z } from 'zod';

/**
 * Every message published to NATS is wrapped in this envelope.
 * `eventId` is the idempotency key consumers dedupe on; `correlationId`
 * traces the originating request end-to-end across services.
 */
export const eventEnvelopeSchema = <T extends z.ZodType>(payload: T) =>
  z.object({
    eventId: z.uuid(),
    eventVersion: z.number().int().positive(),
    occurredOn: z.iso.datetime(),
    correlationId: z.uuid(),
    payload,
  });

export type EventEnvelope<T> = {
  eventId: string;
  eventVersion: number;
  occurredOn: string;
  correlationId: string;
  payload: T;
};
