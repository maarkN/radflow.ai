import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  attachTranscript,
  generateDraft,
  signReport,
  startReport,
  updateReport,
} from '../lib/api';
import type { ApiError, Report, ReportSections } from '../lib/api';
import { getRadiologistId } from '../lib/radiologist';
import { useSpeech } from '../features/dictation/use-speech';

const EMPTY_SECTIONS: ReportSections = { technique: '', findings: '', impression: '' };

export function DictationPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const radiologistId = getRadiologistId();

  const [report, setReport] = useState<Report | null>(null);
  const [transcript, setTranscript] = useState('');
  const [sections, setSections] = useState<ReportSections>(EMPTY_SECTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeech((text) =>
    setTranscript((current) => (current ? `${current} ${text}` : text)),
  );

  useEffect(() => {
    if (!studyId) {
      return;
    }
    startReport(studyId, radiologistId)
      .then((started) => {
        setReport(started);
        setTranscript(started.transcript ?? '');
        setSections(started.sections ?? EMPTY_SECTIONS);
      })
      .catch((cause: ApiError) => setError(cause.message));
  }, [studyId, radiologistId]);

  const run = async (action: () => Promise<Report>) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      setReport(updated);
      if (updated.sections) {
        setSections(updated.sections);
      }
      return updated;
    } catch (cause) {
      setError((cause as ApiError).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const onGenerateDraft = async () => {
    if (!report) {
      return;
    }
    await run(async () => {
      await attachTranscript(report.id, transcript);
      return generateDraft(report.id);
    });
  };

  const onSign = async () => {
    if (!report) {
      return;
    }
    const signed = await run(async () => {
      await updateReport(report.id, sections);
      return signReport(report.id, radiologistId);
    });
    if (signed?.status === 'signed') {
      navigate('/');
    }
  };

  if (!report) {
    return (
      <section>
        <h1>Dictation</h1>
        {error ? <p className="alert">{error}</p> : <p className="empty-state">Opening report…</p>}
      </section>
    );
  }

  const isSigned = report.status === 'signed';

  return (
    <section className="dictation">
      <div className="page-header">
        <h1>Dictation</h1>
        <span className="muted mono" title={report.studyId}>
          study: {report.studyId.slice(0, 8)}
        </span>
      </div>

      {error && <p className="alert">{error}</p>}
      {report.criticalFinding && (
        <p className="alert critical" role="alert">
          Critical finding: {report.criticalFinding}
        </p>
      )}

      <div className="dictation-grid">
        <div>
          <h2>Transcript</h2>
          {speech.isSupported ? (
            <button
              className={speech.isListening ? 'recording' : ''}
              onClick={() => (speech.isListening ? speech.stop() : speech.start())}
              disabled={isSigned}
            >
              {speech.isListening ? '■ Stop dictation' : '● Start dictation'}
            </button>
          ) : (
            <p className="muted">
              Voice dictation is not supported in this browser — type the transcript below.
            </p>
          )}
          <textarea
            aria-label="Transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={12}
            disabled={isSigned}
            placeholder="Dictate or type the findings…"
          />
          <button onClick={() => void onGenerateDraft()} disabled={busy || isSigned || !transcript}>
            Generate AI draft
          </button>
          {report.provider && <span className="muted"> draft by: {report.provider}</span>}
        </div>

        <div>
          <h2>Report</h2>
          {(['technique', 'findings', 'impression'] as const).map((key) => (
            <label key={key} className="section-editor">
              {key}
              <textarea
                aria-label={key}
                value={sections[key]}
                onChange={(event) =>
                  setSections((current) => ({ ...current, [key]: event.target.value }))
                }
                rows={key === 'findings' ? 8 : 3}
                disabled={isSigned}
              />
            </label>
          ))}
          <button
            className="sign"
            onClick={() => void onSign()}
            disabled={busy || isSigned || !sections.findings}
          >
            {isSigned ? 'Signed' : 'Sign report'}
          </button>
        </div>
      </div>
    </section>
  );
}
