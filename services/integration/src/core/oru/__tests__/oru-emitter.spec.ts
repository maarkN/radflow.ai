import { randomUUID } from 'node:crypto';
import { createOruHandler } from '../oru-emitter';
import { OruStore } from '../oru-store';

const signedEnvelope = () => ({
  eventId: randomUUID(),
  eventVersion: 1,
  occurredOn: new Date().toISOString(),
  correlationId: randomUUID(),
  payload: {
    studyId: randomUUID(),
    reportId: randomUUID(),
    signedBy: randomUUID(),
    signedAt: '2026-07-23T15:30:00.000Z',
    contentHash: 'sha256:abc',
  },
});

const studyDetails = {
  id: 'study-1',
  accessionNumber: 'ACC-42',
  patientName: 'DOE, JOHN',
  modality: 'CT',
};

describe('createOruHandler', () => {
  it('builds and stores an ORU enriched with worklist data', async () => {
    const store = new OruStore();
    const handler = createOruHandler(async () => studyDetails, store);

    const envelope = signedEnvelope();
    await handler({ subject: 'radflow.study.signed', envelope, redeliveryCount: 0 });

    const stored = store.findByAccession('ACC-42');
    expect(stored).not.toBeNull();
    expect(stored!.message).toContain('ORU^R01');
    expect(stored!.message).toContain('OBR|1||ACC-42|CT^Radiology Study');
    expect(stored!.message).toContain('DOE^JOHN');
    expect(stored!.message).toContain('sha256:abc');
  });

  it('forwards the ORU to the outbound sender when configured', async () => {
    const sent: string[] = [];
    const handler = createOruHandler(
      async () => studyDetails,
      new OruStore(),
      async (message) => {
        sent.push(message);
      },
    );
    await handler({ subject: 'radflow.study.signed', envelope: signedEnvelope(), redeliveryCount: 0 });
    expect(sent).toHaveLength(1);
  });

  it('rejects an envelope that violates the study.signed contract', async () => {
    const handler = createOruHandler(async () => studyDetails, new OruStore());
    await expect(
      handler({ subject: 'radflow.study.signed', envelope: { broken: true }, redeliveryCount: 0 }),
    ).rejects.toThrow();
  });

  it('propagates worklist fetch failures so the consumer retries', async () => {
    const handler = createOruHandler(async () => {
      throw new Error('worklist down');
    }, new OruStore());
    await expect(
      handler({ subject: 'radflow.study.signed', envelope: signedEnvelope(), redeliveryCount: 0 }),
    ).rejects.toThrow('worklist down');
  });
});

describe('OruStore', () => {
  it('evicts the oldest entries beyond capacity and lists newest first', () => {
    const store = new OruStore(2);
    for (const n of [1, 2, 3]) {
      store.add({
        accessionNumber: `A-${n}`,
        studyId: `s-${n}`,
        message: 'MSH|...',
        emittedAt: new Date(),
      });
    }
    expect(store.list().map((item) => item.accessionNumber)).toEqual(['A-3', 'A-2']);
    expect(store.findByAccession('A-1')).toBeNull();
  });
});
