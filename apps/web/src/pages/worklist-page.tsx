import { useState } from 'react';
import { getDicomStudy } from '../lib/api';
import type { ApiError, WorklistFilters } from '../lib/api';
import { WorklistFiltersBar } from '../features/worklist/components/worklist-filters';
import { WorklistTable } from '../features/worklist/components/worklist-table';
import { useWorklist } from '../features/worklist/use-worklist';

export function WorklistPage() {
  const [filters, setFilters] = useState<WorklistFilters>({});
  const [viewerError, setViewerError] = useState<string | null>(null);
  const { query, claim, release, radiologistId, actionError } = useWorklist(filters);

  const openImages = async (accessionNumber: string) => {
    setViewerError(null);
    try {
      const dicom = await getDicomStudy(accessionNumber);
      window.open(dicom.viewerUrl, '_blank', 'noopener');
    } catch (error) {
      setViewerError(
        (error as ApiError).statusCode === 404
          ? `No DICOM images found for ${accessionNumber}.`
          : `Failed to open the viewer for ${accessionNumber}.`,
      );
    }
  };

  return (
    <section>
      <div className="page-header">
        <h1>Worklist</h1>
        <span className="muted mono" title={radiologistId}>
          you: {radiologistId.slice(0, 8)}
        </span>
      </div>

      <WorklistFiltersBar filters={filters} onChange={setFilters} />

      {actionError && <p className="alert">{actionError}</p>}
      {viewerError && <p className="alert">{viewerError}</p>}
      {query.isLoading && <p className="empty-state">Loading worklist…</p>}
      {query.isError && <p className="alert">Failed to load the worklist. Is the gateway up?</p>}

      {query.data && (
        <WorklistTable
          studies={query.data.data}
          radiologistId={radiologistId}
          onClaim={(studyId) => claim.mutate(studyId)}
          onRelease={(studyId) => release.mutate(studyId)}
          onViewImages={(accessionNumber) => void openImages(accessionNumber)}
          busy={claim.isPending || release.isPending}
        />
      )}
    </section>
  );
}
