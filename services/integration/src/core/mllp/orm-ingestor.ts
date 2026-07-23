import { randomUUID } from 'node:crypto';
import { hl7OrmReceivedEventSchema, Subjects } from '@radflow/shared';
import type { IEventPublisher } from '@radflow/messaging';
import { buildAck } from '../hl7/ack.builder';
import { Hl7Message, Hl7ParseError } from '../hl7/hl7-message';
import { parseOrmMessage } from '../hl7/orm.parser';

/**
 * Turns raw HL7 ORM messages into radflow.hl7.orm_received events.
 * The Nats-Msg-Id derives from MSH-10 (message control id), so a RIS
 * retransmitting the same message is deduplicated by JetStream.
 */
export class OrmIngestor {
  constructor(private readonly publisher: IEventPublisher) {}

  async handle(raw: string): Promise<string> {
    let controlId = 'UNKNOWN';
    try {
      controlId = Hl7Message.parse(raw).messageControlId || 'UNKNOWN';
      const payload = parseOrmMessage(raw);

      const envelope = {
        eventId: randomUUID(),
        eventVersion: 1,
        occurredOn: new Date().toISOString(),
        correlationId: randomUUID(),
        payload,
      };
      hl7OrmReceivedEventSchema.parse(envelope);

      const messageId = `orm-${payload.sendingFacility ?? 'unknown'}-${controlId}`;
      await this.publisher.publish(Subjects.Hl7OrmReceived, envelope, messageId);
      return buildAck(controlId, 'AA');
    } catch (error) {
      if (error instanceof Hl7ParseError) {
        return buildAck(controlId, 'AE', error.message);
      }
      return buildAck(controlId, 'AR', 'internal error');
    }
  }
}
