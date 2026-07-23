import { studySignedEventSchema } from '@radflow/shared';
import type { ConsumedMessage } from '@radflow/messaging';
import { buildOruMessage } from '../hl7/oru.builder';
import type { OruStore } from './oru-store';

export type StudyDetails = {
  id: string;
  accessionNumber: string;
  patientName: string;
  modality: string;
};

export type FetchStudy = (studyId: string) => Promise<StudyDetails>;
export type SendOru = (message: string) => Promise<void>;

/**
 * Consumes radflow.study.signed and emits the corresponding ORU^R01.
 * Study demographics come from the worklist API; the report body carries a
 * reference + content hash (full sections arrive with the dictation flow).
 */
export function createOruHandler(
  fetchStudy: FetchStudy,
  store: OruStore,
  sendOru?: SendOru,
): (message: ConsumedMessage) => Promise<void> {
  return async ({ envelope }) => {
    const event = studySignedEventSchema.parse(envelope);
    const study = await fetchStudy(event.payload.studyId);

    const message = buildOruMessage({
      accessionNumber: study.accessionNumber,
      patientName: study.patientName,
      modality: study.modality,
      signedBy: event.payload.signedBy,
      signedAt: new Date(event.payload.signedAt),
      contentHash: event.payload.contentHash,
      sections: {
        technique: `See RadFlow report ${event.payload.reportId}`,
        findings: `See RadFlow report ${event.payload.reportId}`,
        impression: `Signed radiology report ${event.payload.reportId}`,
      },
      messageControlId: `ORU-${event.eventId.slice(0, 13)}`,
    });

    store.add({
      accessionNumber: study.accessionNumber,
      studyId: study.id,
      message,
      emittedAt: new Date(),
    });
    if (sendOru) {
      await sendOru(message);
    }
  };
}
