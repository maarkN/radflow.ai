import {
  studyCriticalFindingPayloadSchema,
  studyOrderedPayloadSchema,
  studySignedPayloadSchema,
} from '../study.events';

const uuid = () => crypto.randomUUID();

describe('studyOrderedPayloadSchema', () => {
  const valid = {
    studyId: uuid(),
    accessionNumber: 'ACC-2026-0001',
    patientName: 'Test Patient',
    modality: 'CT',
    priority: 'stat',
    orderedAt: '2026-07-22T12:00:00.000Z',
    slaDeadline: '2026-07-22T13:00:00.000Z',
  };

  it('accepts a valid payload', () => {
    expect(studyOrderedPayloadSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['unknown modality', { ...valid, modality: 'XR' }],
    ['unknown priority', { ...valid, priority: 'asap' }],
    ['empty accessionNumber', { ...valid, accessionNumber: '' }],
    ['slaDeadline not ISO', { ...valid, slaDeadline: 'tomorrow' }],
  ])('rejects when %s', (_label, input) => {
    expect(studyOrderedPayloadSchema.safeParse(input).success).toBe(false);
  });
});

describe('studySignedPayloadSchema', () => {
  const valid = {
    studyId: uuid(),
    reportId: uuid(),
    signedBy: uuid(),
    signedAt: '2026-07-22T12:30:00.000Z',
    contentHash: 'sha256:abc123',
  };

  it('accepts a valid payload', () => {
    expect(studySignedPayloadSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an empty contentHash', () => {
    expect(studySignedPayloadSchema.safeParse({ ...valid, contentHash: '' }).success).toBe(false);
  });
});

describe('studyCriticalFindingPayloadSchema', () => {
  const valid = {
    studyId: uuid(),
    description: 'Pneumothorax detected',
    detectedAt: '2026-07-22T12:15:00.000Z',
  };

  it('accepts a payload without reportId (finding before dictation ends)', () => {
    expect(studyCriticalFindingPayloadSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an empty description', () => {
    expect(studyCriticalFindingPayloadSchema.safeParse({ ...valid, description: '' }).success).toBe(
      false,
    );
  });
});
