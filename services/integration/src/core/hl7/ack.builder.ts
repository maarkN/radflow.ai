import { isoToHl7Timestamp } from './hl7-message';

export type AckCode = 'AA' | 'AE' | 'AR';

/** HL7 ACK for MLLP: AA = accepted, AE = error, AR = rejected. */
export function buildAck(
  messageControlId: string,
  code: AckCode,
  now: Date = new Date(),
  errorText?: string,
): string {
  const segments = [
    `MSH|^~\\&|RADFLOW|RADFLOW|||${isoToHl7Timestamp(now)}||ACK|${messageControlId}-ACK|P|2.5.1`,
    `MSA|${code}|${messageControlId}${errorText ? `|${errorText}` : ''}`,
  ];
  return segments.join('\r');
}
