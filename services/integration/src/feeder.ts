import { parseArgs } from 'node:util';
import { buildOrmMessage } from './core/hl7/orm.builder';
import { sendMllp } from './core/mllp/mllp-client';
import { OrthancClient } from './core/dicom/orthanc-client';
import { generateOrder } from './feeder/generate-order';

/**
 * radflow-feeder: injects synthetic studies at a fixed rate — HL7 ORM via
 * MLLP (worklist path) + matching DICOM in Orthanc (viewer path).
 *
 *   pnpm --filter @radflow/integration feeder -- --rate 20 --duration 120
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      rate: { type: 'string', default: '20' },
      duration: { type: 'string', default: '120' },
      count: { type: 'string' },
      mllp: { type: 'string', default: 'localhost:2575' },
      orthanc: { type: 'string', default: 'http://localhost:8042' },
      instances: { type: 'string', default: '3' },
    },
  });

  const rate = Number(values.rate);
  const durationSeconds = Number(values.duration);
  const total = values.count ? Number(values.count) : Math.ceil((rate * durationSeconds) / 60);
  const intervalMs = 60_000 / rate;
  const [mllpHost, mllpPort] = values.mllp!.split(':');
  const orthanc = new OrthancClient(values.orthanc!);
  const runId = Date.now().toString(36).toUpperCase();

  console.log(
    `feeder: run ${runId} — ${total} studies at ${rate}/min (every ${Math.round(intervalMs)}ms)`,
  );

  const stats = { sent: 0, ackAA: 0, ackOther: 0, dicomOk: 0, failures: 0 };

  for (let index = 0; index < total; index += 1) {
    const startedAt = Date.now();
    const order = generateOrder(runId, index, new Date());
    try {
      const ack = await sendMllp(mllpHost!, Number(mllpPort), buildOrmMessage(order));
      stats.sent += 1;
      if (ack.includes('MSA|AA|')) {
        stats.ackAA += 1;
      } else {
        stats.ackOther += 1;
        console.error(`feeder: non-AA ack for ${order.accessionNumber}: ${ack.split('\r')[1]}`);
      }

      await orthanc.createSyntheticStudy({
        accessionNumber: order.accessionNumber,
        patientName: order.patientName,
        modality: order.modality,
        instances: Number(values.instances),
      });
      stats.dicomOk += 1;
    } catch (error) {
      stats.failures += 1;
      console.error(`feeder: failure for ${order.accessionNumber}:`, error);
    }

    const elapsed = Date.now() - startedAt;
    if (index < total - 1 && elapsed < intervalMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs - elapsed));
    }
  }

  console.log(
    `feeder: done — sent=${stats.sent} ackAA=${stats.ackAA} ackOther=${stats.ackOther} ` +
      `dicomOk=${stats.dicomOk} failures=${stats.failures} (run ${runId})`,
  );
  process.exit(stats.failures === 0 && stats.ackOther === 0 ? 0 : 1);
}

void main();
