import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorklistStats } from '../../../lib/api';
import * as api from '../../../lib/api';
import { StatsPanel } from '../stats-panel';

vi.mock('../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getWorklistStats: vi.fn(),
}));

vi.mock('../../../lib/socket', () => ({
  getSocket: () => ({ on: vi.fn(), off: vi.fn() }),
}));

const stats: WorklistStats = {
  queueByStatus: { unread: 4, in_progress: 2, dictated: 1, signed: 7 },
  slaAtRiskCount: 3,
  slaBreachedCount: 1,
  avgTurnaroundMinutes: 42.5,
  orderedLastHour: 5,
  signedLastHour: 2,
};

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <StatsPanel />
    </QueryClientProvider>,
  );
}

describe('StatsPanel', () => {
  it('renders queue, SLA and turnaround metrics', async () => {
    vi.mocked(api.getWorklistStats).mockResolvedValue(stats);
    renderPanel();

    expect(await screen.findByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('SLA at risk')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('42.5m')).toBeInTheDocument();
    expect(screen.getByText('5 / 2')).toBeInTheDocument();
  });

  it('shows an error state when the stats request fails', async () => {
    vi.mocked(api.getWorklistStats).mockRejectedValue(new Error('boom'));
    renderPanel();

    expect(await screen.findByText('Could not load worklist metrics.')).toBeInTheDocument();
  });
});
