import { sendMllp } from '../mllp-client';
import { MllpServer } from '../mllp-server';

describe('sendMllp', () => {
  it('sends a framed message and resolves with the ack (loopback)', async () => {
    const server = new MllpServer(async (raw) => `ACK:${raw}`);
    const port = await server.listen(0);

    const ack = await sendMllp('127.0.0.1', port, 'MSH|hello');
    expect(ack).toBe('ACK:MSH|hello');

    await server.close();
  });

  it('rejects on ack timeout', async () => {
    const server = new MllpServer(
      () => new Promise((resolve) => setTimeout(() => resolve('late'), 2_000)),
    );
    const port = await server.listen(0);

    await expect(sendMllp('127.0.0.1', port, 'MSH|slow', 300)).rejects.toThrow(/timeout/);
    await server.close();
  });
});
