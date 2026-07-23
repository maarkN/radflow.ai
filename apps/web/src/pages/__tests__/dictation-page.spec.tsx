import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Report } from '../../lib/api';
import * as api from '../../lib/api';
import { DictationPage } from '../dictation-page';

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  startReport: vi.fn(),
  attachTranscript: vi.fn(),
  generateDraft: vi.fn(),
  updateReport: vi.fn(),
  signReport: vi.fn(),
}));

const baseReport: Report = {
  id: 'r-1',
  studyId: 'aaaaaaaa-0000-4000-8000-000000000001',
  radiologistId: 'rad-1',
  transcript: null,
  sections: null,
  criticalFinding: null,
  provider: null,
  status: 'draft',
  contentHash: null,
  signedAt: null,
};

function renderPage() {
  const router = createMemoryRouter(
    [{ path: '/dictate/:studyId', element: <DictationPage /> }],
    { initialEntries: [`/dictate/${baseReport.studyId}`] },
  );
  return render(<RouterProvider router={router} />);
}

describe('DictationPage', () => {
  beforeEach(() => {
    vi.mocked(api.startReport).mockResolvedValue(baseReport);
  });

  it('opens the draft report and shows the manual fallback when speech is unsupported', async () => {
    renderPage();
    await waitFor(() => expect(api.startReport).toHaveBeenCalled());
    expect(await screen.findByLabelText('Transcript')).toBeInTheDocument();
    expect(screen.getByText(/not supported in this browser/)).toBeInTheDocument();
  });

  it('generates the AI draft from the typed transcript and shows the critical banner', async () => {
    vi.mocked(api.attachTranscript).mockResolvedValue(baseReport);
    vi.mocked(api.generateDraft).mockResolvedValue({
      ...baseReport,
      sections: { technique: 'CT', findings: 'Pneumothorax.', impression: 'CRITICAL' },
      criticalFinding: 'Pneumothorax.',
      provider: 'stub',
    });

    renderPage();
    const transcript = await screen.findByLabelText('Transcript');
    fireEvent.change(transcript, { target: { value: 'Pneumothorax on the right.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI draft' }));

    await waitFor(() => expect(api.generateDraft).toHaveBeenCalledWith('r-1'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Critical finding: Pneumothorax.');
    expect(screen.getByLabelText('findings')).toHaveValue('Pneumothorax.');
  });

  it('signs the edited report', async () => {
    vi.mocked(api.updateReport).mockResolvedValue(baseReport);
    vi.mocked(api.signReport).mockResolvedValue({
      ...baseReport,
      status: 'signed',
      contentHash: 'sha256:x',
    });

    renderPage();
    const findings = await screen.findByLabelText('findings');
    fireEvent.change(findings, { target: { value: 'Clear lungs.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign report' }));

    await waitFor(() => expect(api.signReport).toHaveBeenCalled());
    expect(api.updateReport).toHaveBeenCalledWith(
      'r-1',
      expect.objectContaining({ findings: 'Clear lungs.' }),
    );
  });
});
