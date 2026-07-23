import { buildOrmMessage } from '../../core/hl7/orm.builder';
import { parseOrmMessage } from '../../core/hl7/orm.parser';
import { generateOrder } from '../generate-order';

describe('generateOrder', () => {
  const orderedAt = new Date('2026-07-23T12:00:00Z');

  it('is deterministic per run and index, with unique accessions', () => {
    const a = generateOrder('RUN1', 0, orderedAt);
    const b = generateOrder('RUN1', 0, orderedAt);
    expect(a).toEqual(b);

    const accessions = Array.from(
      { length: 50 },
      (_, index) => generateOrder('RUN1', index, orderedAt).accessionNumber,
    );
    expect(new Set(accessions).size).toBe(50);
  });

  it('every generated order round-trips through the HL7 codec unchanged', () => {
    for (let index = 0; index < 20; index += 1) {
      const order = generateOrder('RT', index, orderedAt);
      const parsed = parseOrmMessage(buildOrmMessage(order));
      expect(parsed).toEqual({
        accessionNumber: order.accessionNumber,
        patientName: order.patientName,
        modality: order.modality,
        priority: order.priority,
        orderedAt: orderedAt.toISOString(),
        placerOrderNumber: order.placerOrderNumber,
        sendingFacility: order.sendingFacility,
      });
    }
  });

  it('follows the priority mix (3 stat / 6 urgent / 11 routine per 20)', () => {
    const priorities = Array.from(
      { length: 20 },
      (_, index) => generateOrder('MIX', index, orderedAt).priority,
    );
    expect(priorities.filter((priority) => priority === 'stat')).toHaveLength(3);
    expect(priorities.filter((priority) => priority === 'urgent')).toHaveLength(6);
    expect(priorities.filter((priority) => priority === 'routine')).toHaveLength(11);
  });
});
