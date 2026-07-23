import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Study } from '../../../../lib/api';
import { WorklistTable } from '../worklist-table';

const ME = 'aaaaaaaa-0000-4000-8000-000000000001';

const study = (overrides: Partial<Study>): Study => ({
  id: crypto.randomUUID(),
  accessionNumber: 'ACC-1',
  patientName: 'Patient',
  modality: 'CT',
  priority: 'stat',
  status: 'unread',
  orderedAt: '2026-07-22T12:00:00Z',
  slaDeadline: '2026-07-22T13:00:00Z',
  assignedTo: null,
  reportId: null,
  ...overrides,
});

describe('WorklistTable', () => {
  it('shows a Claim button for unread studies and calls onClaim', () => {
    const onClaim = vi.fn();
    const unread = study({ accessionNumber: 'ACC-CLAIM' });
    render(
      <WorklistTable
        studies={[unread]}
        radiologistId={ME}
        onClaim={onClaim}
        onRelease={vi.fn()}
        onViewImages={vi.fn()}
        busy={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Claim' }));
    expect(onClaim).toHaveBeenCalledWith(unread.id);
  });

  it('shows Release only for studies claimed by me', () => {
    render(
      <WorklistTable
        studies={[
          study({ status: 'in_progress', assignedTo: ME, accessionNumber: 'MINE' }),
          study({ status: 'in_progress', assignedTo: crypto.randomUUID(), accessionNumber: 'OTHER' }),
        ]}
        radiologistId={ME}
        onClaim={vi.fn()}
        onRelease={vi.fn()}
        onViewImages={vi.fn()}
        busy={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Release' })).toBeInTheDocument();
    expect(screen.getByText('claimed')).toBeInTheDocument();
  });

  it('opens the viewer for the study accession', () => {
    const onViewImages = vi.fn();
    render(
      <WorklistTable
        studies={[study({ accessionNumber: 'ACC-IMG' })]}
        radiologistId={ME}
        onClaim={vi.fn()}
        onRelease={vi.fn()}
        onViewImages={onViewImages}
        busy={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Images' }));
    expect(onViewImages).toHaveBeenCalledWith('ACC-IMG');
  });

  it('renders the empty state without studies', () => {
    render(
      <WorklistTable
        studies={[]}
        radiologistId={ME}
        onClaim={vi.fn()}
        onRelease={vi.fn()}
        onViewImages={vi.fn()}
        busy={false}
      />,
    );
    expect(screen.getByText(/No studies match/)).toBeInTheDocument();
  });
});
