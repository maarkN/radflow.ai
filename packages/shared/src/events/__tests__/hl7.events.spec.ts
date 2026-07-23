import { hl7OrmReceivedPayloadSchema } from '../hl7.events';
import { dlqSubjectFor, Subjects } from '../subjects';

describe('hl7OrmReceivedPayloadSchema', () => {
  const valid = {
    accessionNumber: 'ACC-2026-0001',
    patientName: 'DOE^JOHN',
    modality: 'CT',
    priority: 'stat',
    orderedAt: '2026-07-23T12:00:00.000Z',
  };

  it('accepts a valid payload without the optional fields', () => {
    expect(hl7OrmReceivedPayloadSchema.parse(valid)).toEqual(valid);
  });

  it('accepts placer order number and sending facility', () => {
    const parsed = hl7OrmReceivedPayloadSchema.parse({
      ...valid,
      placerOrderNumber: 'PO-1',
      sendingFacility: 'GENERAL HOSPITAL',
    });
    expect(parsed.sendingFacility).toBe('GENERAL HOSPITAL');
  });

  it.each([
    ['empty accession', { ...valid, accessionNumber: '' }],
    ['unknown modality', { ...valid, modality: 'PET' }],
    ['orderedAt not ISO', { ...valid, orderedAt: '202607231200' }],
  ])('rejects when %s', (_label, input) => {
    expect(hl7OrmReceivedPayloadSchema.safeParse(input).success).toBe(false);
  });
});

describe('dlqSubjectFor', () => {
  it('parks subjects under the dlq prefix', () => {
    expect(dlqSubjectFor(Subjects.Hl7OrmReceived)).toBe('radflow.dlq.radflow.hl7.orm_received');
  });
});
