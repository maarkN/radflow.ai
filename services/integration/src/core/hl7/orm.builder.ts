import type { Hl7OrmReceivedPayload, Priority } from '@radflow/shared';
import { isoToHl7Timestamp } from './hl7-message';

const CODE_BY_PRIORITY: Record<Priority, string> = {
  stat: 'S',
  urgent: 'A',
  routine: 'R',
};

export type OrmOrderData = Omit<Hl7OrmReceivedPayload, 'orderedAt'> & {
  orderedAt: Date;
  messageControlId: string;
};

/** Builds an ORM^O01 that parseOrmMessage reads back identically (round-trip). */
export function buildOrmMessage(order: OrmOrderData): string {
  const timestamp = isoToHl7Timestamp(order.orderedAt);
  const [family = '', given = ''] = order.patientName.split(', ');
  const facility = order.sendingFacility ?? 'RADFLOW-FEEDER';
  const placer = order.placerOrderNumber ?? '';

  const segments = [
    `MSH|^~\\&|RIS|${facility}|RADFLOW|RADFLOW|${timestamp}||ORM^O01|${order.messageControlId}|P|2.5.1`,
    `PID|1|||${''}|${family}^${given}`,
    `ORC|NW|${placer}|${order.accessionNumber}||||||${timestamp}`,
    `OBR|1|${placer}|${order.accessionNumber}|RAD^Radiology Order|${CODE_BY_PRIORITY[order.priority]}||${timestamp}|||||||||||||||||${order.modality}`,
  ];
  return segments.join('\r');
}
