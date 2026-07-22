import { z } from 'zod';
import { eventEnvelopeSchema } from '../envelope';

const schema = eventEnvelopeSchema(z.object({ value: z.string() }));

const validEnvelope = {
  eventId: 'c2a7f3f0-2f2b-4b1a-9d2e-8f0b6a1c9d10',
  eventVersion: 1,
  occurredOn: '2026-07-22T12:00:00.000Z',
  correlationId: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
  payload: { value: 'ok' },
};

describe('eventEnvelopeSchema', () => {
  it('accepts a valid envelope', () => {
    expect(schema.parse(validEnvelope)).toEqual(validEnvelope);
  });

  it.each([
    ['eventId is not a uuid', { ...validEnvelope, eventId: 'not-a-uuid' }],
    ['eventVersion is zero', { ...validEnvelope, eventVersion: 0 }],
    ['eventVersion is not an integer', { ...validEnvelope, eventVersion: 1.5 }],
    ['occurredOn is not ISO datetime', { ...validEnvelope, occurredOn: '22/07/2026' }],
    ['correlationId is missing', { ...validEnvelope, correlationId: undefined }],
    ['payload violates inner schema', { ...validEnvelope, payload: { value: 42 } }],
  ])('rejects when %s', (_label, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
});
