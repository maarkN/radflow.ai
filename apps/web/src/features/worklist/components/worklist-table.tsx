import { Link } from 'react-router-dom';
import type { Study } from '../../../lib/api';
import { PriorityBadge } from './priority-badge';
import { SlaCountdown } from './sla-countdown';

type Props = {
  studies: Study[];
  radiologistId: string;
  onClaim: (studyId: string) => void;
  onRelease: (studyId: string) => void;
  onViewImages: (accessionNumber: string) => void;
  busy: boolean;
};

export function WorklistTable({
  studies,
  radiologistId,
  onClaim,
  onRelease,
  onViewImages,
  busy,
}: Props) {
  if (studies.length === 0) {
    return <p className="empty-state">No studies match the current filters.</p>;
  }

  return (
    <table className="worklist">
      <thead>
        <tr>
          <th>Priority</th>
          <th>SLA</th>
          <th>Accession</th>
          <th>Patient</th>
          <th>Modality</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {studies.map((study) => {
          const isMine = study.assignedTo === radiologistId;
          return (
            <tr key={study.id} className={isMine ? 'row-mine' : ''}>
              <td>
                <PriorityBadge priority={study.priority} />
              </td>
              <td>
                <SlaCountdown deadline={study.slaDeadline} />
              </td>
              <td className="mono">{study.accessionNumber}</td>
              <td>{study.patientName}</td>
              <td>{study.modality}</td>
              <td>
                <span className={`status status-${study.status}`}>
                  {study.status.replace('_', ' ')}
                </span>
              </td>
              <td>
                {study.status === 'unread' && (
                  <button disabled={busy} onClick={() => onClaim(study.id)}>
                    Claim
                  </button>
                )}
                {study.status === 'in_progress' && isMine && (
                  <>
                    <Link className="button-link" to={`/dictate/${study.id}`}>
                      Dictate
                    </Link>
                    <button
                      disabled={busy}
                      className="secondary"
                      onClick={() => onRelease(study.id)}
                    >
                      Release
                    </button>
                  </>
                )}
                {study.status === 'in_progress' && !isMine && (
                  <span className="muted">claimed</span>
                )}
                <button
                  className="ghost"
                  onClick={() => onViewImages(study.accessionNumber)}
                  title="Open in the OHIF viewer"
                >
                  Images
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
