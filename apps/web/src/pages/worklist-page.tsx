import { useState } from 'react';
import type { WorklistFilters } from '../lib/api';
import { WorklistFiltersBar } from '../features/worklist/components/worklist-filters';
import { WorklistTable } from '../features/worklist/components/worklist-table';
import { useWorklist } from '../features/worklist/use-worklist';

export function WorklistPage() {
  const [filters, setFilters] = useState<WorklistFilters>({});
  const { query, claim, release, radiologistId, actionError } = useWorklist(filters);

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
      {query.isLoading && <p className="empty-state">Loading worklist…</p>}
      {query.isError && <p className="alert">Failed to load the worklist. Is the gateway up?</p>}

      {query.data && (
        <WorklistTable
          studies={query.data.data}
          radiologistId={radiologistId}
          onClaim={(studyId) => claim.mutate(studyId)}
          onRelease={(studyId) => release.mutate(studyId)}
          busy={claim.isPending || release.isPending}
        />
      )}
    </section>
  );
}
