import type { Modality, Priority } from '@radflow/shared';
import type { OrmOrderData } from '../core/hl7/orm.builder';

const FAMILY_NAMES = ['SILVA', 'DOE', 'GARCIA', 'SMITH', 'TANAKA', 'MULLER', 'ROSSI', 'COSTA'];
const GIVEN_NAMES = ['JOHN', 'MARIA', 'WEI', 'FATIMA', 'LUCAS', 'EMMA', 'NOAH', 'AISHA'];
const MODALITIES: Modality[] = ['CT', 'MR', 'CR', 'US'];
// 3 stat / 6 urgent / 11 routine out of every 20 orders.
const PRIORITY_WHEEL: Priority[] = [
  'stat',
  'urgent',
  'routine',
  'routine',
  'urgent',
  'routine',
  'routine',
  'stat',
  'urgent',
  'routine',
  'routine',
  'urgent',
  'routine',
  'routine',
  'stat',
  'urgent',
  'routine',
  'routine',
  'urgent',
  'routine',
];

/** Deterministic per (runId, index): same run generates the same orders. */
export function generateOrder(runId: string, index: number, orderedAt: Date): OrmOrderData {
  return {
    accessionNumber: `FD-${runId}-${String(index).padStart(4, '0')}`,
    patientName: `${FAMILY_NAMES[index % FAMILY_NAMES.length]}, ${GIVEN_NAMES[Math.floor(index / FAMILY_NAMES.length) % GIVEN_NAMES.length]}`,
    modality: MODALITIES[index % MODALITIES.length]!,
    priority: PRIORITY_WHEEL[index % PRIORITY_WHEEL.length]!,
    orderedAt,
    placerOrderNumber: `PO-${runId}-${index}`,
    sendingFacility: 'RADFLOW-FEEDER',
    messageControlId: `FD${runId}${String(index).padStart(4, '0')}`,
  };
}
