import { isoToHl7Timestamp } from './hl7-message';

export type OruReportData = {
  accessionNumber: string;
  patientName: string;
  modality: string;
  signedBy: string;
  signedAt: Date;
  contentHash: string;
  sections: { technique: string; findings: string; impression: string };
  messageControlId: string;
};

const SENDING_APP = 'RADFLOW';
const SENDING_FACILITY = 'RADFLOW';

/** Escapes HL7 delimiters and turns newlines into HL7 line breaks (\.br\). */
function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\E\\')
    .replaceAll('|', '\\F\\')
    .replaceAll('^', '\\S\\')
    .replaceAll('~', '\\R\\')
    .replaceAll('&', '\\T\\')
    .replaceAll('\n', '\\.br\\');
}

/**
 * Builds an ORU^R01 (observation result) for a signed report. One OBX per
 * report section plus one carrying the content hash for auditability.
 */
export function buildOruMessage(report: OruReportData): string {
  const timestamp = isoToHl7Timestamp(report.signedAt);
  const [family = '', given = ''] = report.patientName.split(', ');

  const segments = [
    `MSH|^~\\&|${SENDING_APP}|${SENDING_FACILITY}|||${timestamp}||ORU^R01|${report.messageControlId}|P|2.5.1`,
    `PID|1||||${family}^${given}`,
    `OBR|1||${report.accessionNumber}|${report.modality}^Radiology Study||||||||||||||||||${timestamp}|||F`,
    `OBX|1|TX|TECHNIQUE^Technique||${escapeText(report.sections.technique)}||||||F`,
    `OBX|2|TX|FINDINGS^Findings||${escapeText(report.sections.findings)}||||||F`,
    `OBX|3|TX|IMPRESSION^Impression||${escapeText(report.sections.impression)}||||||F`,
    `OBX|4|ST|HASH^Report Content Hash||${escapeText(report.contentHash)}||||||F`,
    `OBX|5|ST|SIGNER^Signed By||${escapeText(report.signedBy)}||||||F`,
  ];
  return segments.join('\r');
}
