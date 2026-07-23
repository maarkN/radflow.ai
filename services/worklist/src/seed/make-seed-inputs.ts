import { faker } from '@faker-js/faker';
import type { CreateStudyInput } from '../core/study/application/use-cases/create-study/create-study.input';

/**
 * Deterministic when a seed is given: same seed -> same studies.
 * Priority mix mirrors a plausible radiology queue (15% stat, 30% urgent).
 */
export function makeSeedInputs(count: number, seed = 42, refDate = new Date()): CreateStudyInput[] {
  faker.seed(seed);
  return Array.from({ length: count }, (_, index) => ({
    accessionNumber: `ACC-${String(1000 + index)}-${faker.string.alphanumeric(4).toUpperCase()}`,
    patientName: faker.person.fullName(),
    modality: faker.helpers.arrayElement(['CT', 'MR', 'CR', 'US'] as const),
    priority: faker.helpers.weightedArrayElement([
      { value: 'stat' as const, weight: 15 },
      { value: 'urgent' as const, weight: 30 },
      { value: 'routine' as const, weight: 55 },
    ]),
    orderedAt: faker.date.recent({ days: 0.25, refDate }),
  }));
}
