export class Hl7ParseError extends Error {
  constructor(reason: string) {
    super(`Invalid HL7 message: ${reason}`);
    this.name = 'Hl7ParseError';
  }
}

/**
 * Minimal HL7 v2 pipe-delimited codec. Field numbering follows the HL7
 * convention: SEG-1 is the first field after the segment name, and for MSH
 * the field separator itself counts as MSH-1.
 */
export class Hl7Message {
  private constructor(private readonly segments: string[][]) {}

  static parse(raw: string): Hl7Message {
    const lines = raw
      .split(/\r\n|\r|\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      throw new Hl7ParseError('empty message');
    }
    if (!lines[0]!.startsWith('MSH|')) {
      throw new Hl7ParseError('message must start with an MSH segment');
    }
    return new Hl7Message(lines.map((line) => line.split('|')));
  }

  /** First segment with the given name, or null. */
  segment(name: string): string[] | null {
    return this.segments.find((fields) => fields[0] === name) ?? null;
  }

  /** SEG-<field> as raw string ('' when absent). */
  field(segmentName: string, fieldNumber: number): string {
    const fields = this.segment(segmentName);
    if (!fields) {
      return '';
    }
    if (segmentName === 'MSH') {
      if (fieldNumber === 1) {
        return '|';
      }
      return fields[fieldNumber - 1] ?? '';
    }
    return fields[fieldNumber] ?? '';
  }

  /** Component (1-indexed) of SEG-<field>. */
  component(segmentName: string, fieldNumber: number, componentNumber: number): string {
    return this.field(segmentName, fieldNumber).split('^')[componentNumber - 1] ?? '';
  }

  get messageType(): string {
    return this.field('MSH', 9);
  }

  get messageControlId(): string {
    return this.field('MSH', 10);
  }
}

/** HL7 TS (YYYYMMDD[HHMM[SS]]) -> ISO string. Assumes UTC when no offset. */
export function hl7TimestampToIso(value: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/.exec(value);
  if (!match) {
    throw new Hl7ParseError(`invalid timestamp "${value}"`);
  }
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Hl7ParseError(`invalid timestamp "${value}"`);
  }
  return iso;
}

/** Date -> HL7 TS (YYYYMMDDHHMMSS, UTC). */
export function isoToHl7Timestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
}
