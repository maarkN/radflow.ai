import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAck } from '../ack.builder';
import { Hl7Message, Hl7ParseError, hl7TimestampToIso, isoToHl7Timestamp } from '../hl7-message';
import { buildOruMessage } from '../oru.builder';
import { parseOrmMessage } from '../orm.parser';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('Hl7Message', () => {
  it('parses segments and resolves fields with HL7 numbering (incl. MSH quirk)', () => {
    const message = Hl7Message.parse(fixture('orm-stat-ct.hl7'));
    expect(message.field('MSH', 1)).toBe('|');
    expect(message.field('MSH', 4)).toBe('GENERAL HOSPITAL');
    expect(message.messageType).toBe('ORM^O01');
    expect(message.messageControlId).toBe('MSG00001');
    expect(message.field('PID', 5)).toBe('DOE^JOHN');
    expect(message.component('PID', 5, 2)).toBe('JOHN');
  });

  it('rejects a message without MSH', () => {
    expect(() => Hl7Message.parse('PID|1||X')).toThrow(Hl7ParseError);
  });

  it('round-trips timestamps', () => {
    expect(hl7TimestampToIso('20260723115900')).toBe('2026-07-23T11:59:00.000Z');
    expect(isoToHl7Timestamp(new Date('2026-07-23T11:59:00Z'))).toBe('20260723115900');
  });
});

describe('parseOrmMessage', () => {
  it('parses a STAT CT order (golden file)', () => {
    expect(parseOrmMessage(fixture('orm-stat-ct.hl7'))).toEqual({
      accessionNumber: 'ACC-2026-1001',
      patientName: 'DOE, JOHN',
      modality: 'CT',
      priority: 'stat',
      orderedAt: '2026-07-23T11:59:00.000Z',
      placerOrderNumber: 'PO-555',
      sendingFacility: 'GENERAL HOSPITAL',
    });
  });

  it('parses a routine MR order defaulting priority and falling back to MSH-7', () => {
    const parsed = parseOrmMessage(fixture('orm-routine-mr.hl7'));
    expect(parsed.priority).toBe('routine');
    expect(parsed.modality).toBe('MR');
    expect(parsed.orderedAt).toBe('2026-07-23T09:00:00.000Z');
  });

  it('rejects an order without accession number', () => {
    expect(() => parseOrmMessage(fixture('orm-missing-accession.hl7'))).toThrow(
      /missing accession number/,
    );
  });

  it('rejects non-ORM messages', () => {
    const oru = fixture('orm-stat-ct.hl7').replace('ORM^O01', 'ORU^R01');
    expect(() => parseOrmMessage(oru)).toThrow(/expected ORM\^O01/);
  });
});

describe('buildOruMessage', () => {
  it('builds an ORU^R01 with one OBX per section (golden)', () => {
    const oru = buildOruMessage({
      accessionNumber: 'ACC-2026-1001',
      patientName: 'DOE, JOHN',
      modality: 'CT',
      signedBy: 'rad-1',
      signedAt: new Date('2026-07-23T15:30:00Z'),
      contentHash: 'sha256:abc',
      sections: {
        technique: 'CT chest without contrast',
        findings: 'No acute findings.\nLungs clear.',
        impression: 'Normal study | unremarkable',
      },
      messageControlId: 'ORU00001',
    });
    const lines = oru.split('\r');
    expect(lines[0]).toBe('MSH|^~\\&|RADFLOW|RADFLOW|||20260723153000||ORU^R01|ORU00001|P|2.5.1');
    expect(lines[1]).toBe('PID|1||||DOE^JOHN');
    expect(lines[2]).toContain('OBR|1||ACC-2026-1001|CT^Radiology Study');
    expect(lines[4]).toContain('No acute findings.\\.br\\Lungs clear.');
    expect(lines[5]).toContain('Normal study \\F\\ unremarkable');
    expect(oru).toContain('HASH^Report Content Hash||sha256:abc');
  });

  it('parses back with the generic codec (round trip)', () => {
    const oru = buildOruMessage({
      accessionNumber: 'ACC-1',
      patientName: 'SILVA, MARIA',
      modality: 'MR',
      signedBy: 'rad-2',
      signedAt: new Date('2026-07-23T10:00:00Z'),
      contentHash: 'sha256:def',
      sections: { technique: 't', findings: 'f', impression: 'i' },
      messageControlId: 'ORU00002',
    });
    const message = Hl7Message.parse(oru);
    expect(message.messageType).toBe('ORU^R01');
    expect(message.component('OBR', 3, 1)).toBe('ACC-1');
  });
});

describe('buildAck', () => {
  it('builds an AA ack echoing the control id', () => {
    const ack = buildAck('MSG00001', 'AA', undefined, new Date('2026-07-23T12:00:01Z'));
    expect(ack).toContain('||ACK|MSG00001-ACK|P|2.5.1');
    expect(ack.split('\r')[1]).toBe('MSA|AA|MSG00001');
  });

  it('includes the error text on AE', () => {
    const ack = buildAck('MSG00009', 'AE', 'missing accession');
    expect(ack.split('\r')[1]).toBe('MSA|AE|MSG00009|missing accession');
  });
});
