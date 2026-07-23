import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hl7OrmReceivedEventSchema, Subjects } from '@radflow/shared';
import type { IEventPublisher } from '@radflow/messaging';
import { OrmIngestor } from '../orm-ingestor';

const fixture = (name: string) =>
  readFileSync(join(__dirname, '..', '..', 'hl7', '__tests__', 'fixtures', name), 'utf8');

class FakePublisher implements IEventPublisher {
  published: Array<{ subject: string; envelope: Record<string, unknown>; messageId: string }> = [];

  async publish(subject: string, envelope: Record<string, unknown>, messageId: string) {
    this.published.push({ subject, envelope, messageId });
    return { duplicate: false };
  }
}

describe('OrmIngestor', () => {
  let publisher: FakePublisher;
  let ingestor: OrmIngestor;

  beforeEach(() => {
    publisher = new FakePublisher();
    ingestor = new OrmIngestor(publisher);
  });

  it('publishes a contract-valid orm_received envelope and returns AA', async () => {
    const ack = await ingestor.handle(fixture('orm-stat-ct.hl7'));

    expect(ack).toContain('MSA|AA|MSG00001');
    expect(publisher.published).toHaveLength(1);
    const { subject, envelope } = publisher.published[0]!;
    expect(subject).toBe(Subjects.Hl7OrmReceived);
    expect(hl7OrmReceivedEventSchema.safeParse(envelope).success).toBe(true);
  });

  it('derives a stable message id from facility + control id (RIS retransmission dedupe)', async () => {
    await ingestor.handle(fixture('orm-stat-ct.hl7'));
    await ingestor.handle(fixture('orm-stat-ct.hl7'));
    expect(publisher.published[0]!.messageId).toBe('orm-GENERAL HOSPITAL-MSG00001');
    expect(publisher.published[1]!.messageId).toBe(publisher.published[0]!.messageId);
  });

  it('returns AE with the parse error and publishes nothing for an invalid ORM', async () => {
    const ack = await ingestor.handle(fixture('orm-missing-accession.hl7'));
    expect(ack).toContain('MSA|AE|MSG00003');
    expect(ack).toContain('missing accession number');
    expect(publisher.published).toHaveLength(0);
  });

  it('returns AR when the publisher fails (message can be retransmitted)', async () => {
    const failing = new OrmIngestor({
      publish: async () => {
        throw new Error('nats down');
      },
    });
    const ack = await failing.handle(fixture('orm-stat-ct.hl7'));
    expect(ack).toContain('MSA|AR|MSG00001');
  });
});
