import { connect } from 'node:net';
import type { Socket } from 'node:net';
import { frameMllp, MllpServer, unframeMllp } from '../mllp-server';

const sendAndCollect = (port: number, chunks: Buffer[], expectedAcks: number): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const acks: string[] = [];
    let received = Buffer.alloc(0);
    const socket: Socket = connect(port, '127.0.0.1', () => {
      for (const chunk of chunks) {
        socket.write(chunk);
      }
    });
    socket.on('data', (data) => {
      received = Buffer.concat([received, data]);
      for (let ack = unframeMllp(received); ack !== null; ack = unframeMllp(received)) {
        acks.push(ack);
        received = received.subarray(received.indexOf(0x1c) + 2);
        if (acks.length === expectedAcks) {
          socket.end();
          resolve(acks);
        }
      }
    });
    socket.on('error', reject);
    setTimeout(() => reject(new Error('timeout waiting for acks')), 5000);
  });

describe('MllpServer', () => {
  let server: MllpServer;
  let port: number;
  const handled: string[] = [];

  beforeEach(async () => {
    handled.length = 0;
    server = new MllpServer(async (raw) => {
      handled.push(raw);
      return `ACK-FOR:${raw.slice(0, 3)}`;
    });
    port = await server.listen(0);
  });

  afterEach(async () => {
    await server.close();
  });

  it('handles a framed message and returns the framed ack', async () => {
    const acks = await sendAndCollect(port, [frameMllp('MSH|test-message')], 1);
    expect(handled).toEqual(['MSH|test-message']);
    expect(acks).toEqual(['ACK-FOR:MSH']);
  });

  it('handles multiple messages on the same connection', async () => {
    const acks = await sendAndCollect(port, [frameMllp('MSH|one'), frameMllp('MSH|two')], 2);
    expect(handled).toEqual(['MSH|one', 'MSH|two']);
    expect(acks).toHaveLength(2);
  });

  it('reassembles a message fragmented across TCP chunks', async () => {
    const framed = frameMllp('MSH|fragmented-message');
    const acks = await sendAndCollect(
      port,
      [framed.subarray(0, 5), framed.subarray(5, 12), framed.subarray(12)],
      1,
    );
    expect(handled).toEqual(['MSH|fragmented-message']);
    expect(acks).toHaveLength(1);
  });
});
