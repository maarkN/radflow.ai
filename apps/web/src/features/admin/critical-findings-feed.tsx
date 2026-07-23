import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';

type CriticalFinding = {
  eventId: string;
  studyId: string;
  description: string;
  detectedAt: string;
};

type StudyEvent = {
  subject: string;
  envelope: {
    eventId: string;
    payload: { studyId: string; description: string; detectedAt: string };
  };
};

/** Live feed of radflow.study.critical_finding events pushed by the gateway. */
export function CriticalFindingsFeed() {
  const [findings, setFindings] = useState<CriticalFinding[]>([]);

  useEffect(() => {
    const socket = getSocket();
    const onEvent = (event: StudyEvent) => {
      if (event.subject !== 'radflow.study.critical_finding') {
        return;
      }
      setFindings((current) => {
        if (current.some((finding) => finding.eventId === event.envelope.eventId)) {
          return current;
        }
        return [
          {
            eventId: event.envelope.eventId,
            studyId: event.envelope.payload.studyId,
            description: event.envelope.payload.description,
            detectedAt: event.envelope.payload.detectedAt,
          },
          ...current,
        ].slice(0, 20);
      });
    };
    socket.on('study.event', onEvent);
    return () => {
      socket.off('study.event', onEvent);
    };
  }, []);

  return (
    <div className="critical-feed">
      <h2>Critical findings</h2>
      {findings.length === 0 ? (
        <p className="empty-state">No critical findings reported.</p>
      ) : (
        <ul>
          {findings.map((finding) => (
            <li key={finding.eventId} className="critical-item" role="alert">
              <strong>{finding.description}</strong>
              <span className="muted mono">
                {' '}
                study {finding.studyId.slice(0, 8)} ·{' '}
                {new Date(finding.detectedAt).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
