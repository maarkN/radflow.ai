import type { WorklistFilters } from '../../../lib/api';

type Props = {
  filters: WorklistFilters;
  onChange: (filters: WorklistFilters) => void;
};

const SELECTS: Array<{ key: keyof WorklistFilters; label: string; options: string[] }> = [
  { key: 'status', label: 'Status', options: ['unread', 'in_progress', 'dictated', 'signed'] },
  { key: 'modality', label: 'Modality', options: ['CT', 'MR', 'CR', 'US'] },
  { key: 'priority', label: 'Priority', options: ['stat', 'urgent', 'routine'] },
];

export function WorklistFiltersBar({ filters, onChange }: Props) {
  return (
    <div className="filters">
      {SELECTS.map(({ key, label, options }) => (
        <label key={key}>
          {label}
          <select
            value={filters[key] ?? ''}
            onChange={(event) => onChange({ ...filters, [key]: event.target.value || undefined })}
          >
            <option value="">All</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
