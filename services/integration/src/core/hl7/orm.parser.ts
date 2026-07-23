import { modalitySchema } from '@radflow/shared';
import type { Hl7OrmReceivedPayload, Priority } from '@radflow/shared';
import { Hl7Message, Hl7ParseError, hl7TimestampToIso } from './hl7-message';

const PRIORITY_BY_CODE: Record<string, Priority> = {
  S: 'stat',
  A: 'urgent',
  R: 'routine',
};

/** PID-5 'FAMILY^GIVEN' -> 'FAMILY, GIVEN'. */
function humanizePatientName(pid5: string): string {
  const [family, given] = pid5.split('^');
  if (!family) {
    return pid5;
  }
  return given ? `${family}, ${given}` : family;
}

/**
 * Parses an ORM^O01 (new order) into the payload of radflow.hl7.orm_received.
 * Mapping: accession = OBR-3 (falls back to ORC-3) · modality = OBR-24 ·
 * priority = OBR-5 (S/A/R, falls back to routine) · orderedAt = ORC-9 or MSH-7.
 */
export function parseOrmMessage(raw: string): Hl7OrmReceivedPayload {
  const message = Hl7Message.parse(raw);

  if (!message.messageType.startsWith('ORM^O01')) {
    throw new Hl7ParseError(`expected ORM^O01, got "${message.messageType}"`);
  }
  if (!message.segment('PID')) {
    throw new Hl7ParseError('missing PID segment');
  }
  if (!message.segment('OBR')) {
    throw new Hl7ParseError('missing OBR segment');
  }

  const accessionNumber = message.component('OBR', 3, 1) || message.component('ORC', 3, 1);
  if (!accessionNumber) {
    throw new Hl7ParseError('missing accession number (OBR-3 / ORC-3)');
  }

  const patientName = humanizePatientName(message.field('PID', 5));
  if (!patientName) {
    throw new Hl7ParseError('missing patient name (PID-5)');
  }

  const rawModality = message.field('OBR', 24);
  const modality = modalitySchema.safeParse(rawModality);
  if (!modality.success) {
    throw new Hl7ParseError(`unsupported modality "${rawModality}" (OBR-24)`);
  }

  const priority = PRIORITY_BY_CODE[message.field('OBR', 5)] ?? 'routine';

  const rawOrderedAt = message.field('ORC', 9) || message.field('MSH', 7);
  if (!rawOrderedAt) {
    throw new Hl7ParseError('missing order timestamp (ORC-9 / MSH-7)');
  }

  return {
    accessionNumber,
    patientName,
    modality: modality.data,
    priority,
    orderedAt: hl7TimestampToIso(rawOrderedAt),
    placerOrderNumber: message.component('ORC', 2, 1) || undefined,
    sendingFacility: message.field('MSH', 4) || undefined,
  };
}
