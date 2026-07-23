import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CriticalFindingsFeed } from '../critical-findings-feed';

type Handler = (event: unknown) => void;
const handlers: Handler[] = [];

vi.mock('../../../lib/socket', () => ({
  getSocket: () => ({
    on: (_event: string, handler: Handler) => handlers.push(handler),
    off: () => undefined,
  }),
}));

const criticalEvent = (eventId: string, description: string) => ({
  subject: 'radflow.study.critical_finding',
  envelope: {
    eventId,
    payload: {
      studyId: 'aaaaaaaa-0000-4000-8000-000000000001',
      description,
      detectedAt: '2026-07-23T15:00:00.000Z',
    },
  },
});

describe('CriticalFindingsFeed', () => {
  it('renders findings pushed over the socket, newest first, deduped', () => {
    render(<CriticalFindingsFeed />);
    expect(screen.getByText(/No critical findings/)).toBeInTheDocument();

    act(() => {
      handlers.forEach((handler) => handler(criticalEvent('e1', 'Pneumothorax')));
      handlers.forEach((handler) => handler(criticalEvent('e1', 'Pneumothorax')));
      handlers.forEach((handler) => handler(criticalEvent('e2', 'Free air')));
      handlers.forEach((handler) =>
        handler({ subject: 'radflow.study.ordered', envelope: { eventId: 'x', payload: {} } }),
      );
    });

    const items = screen.getAllByRole('alert');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Free air');
    expect(items[1]).toHaveTextContent('Pneumothorax');
  });
});
