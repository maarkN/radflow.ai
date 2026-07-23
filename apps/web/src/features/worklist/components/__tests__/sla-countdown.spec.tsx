import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlaCountdown } from '../sla-countdown';

describe('SlaCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows minutes and seconds remaining', () => {
    render(<SlaCountdown deadline="2026-07-22T12:01:30Z" />);
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('shows hours for long deadlines', () => {
    render(<SlaCountdown deadline="2026-07-22T14:30:00Z" />);
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('ticks down and flags overdue when the deadline passes', () => {
    render(<SlaCountdown deadline="2026-07-22T12:00:05Z" />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText(/overdue/)).toBeInTheDocument();
    expect(screen.getByText(/overdue/).className).toContain('sla-overdue');
  });
});
