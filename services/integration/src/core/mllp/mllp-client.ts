import { connect } from 'node:net';
import { frameMllp, unframeMllp } from './mllp-server';

/** Sends one HL7 message over MLLP and resolves with the returned ACK. */
export function sendMllp(
  host: string,
  port: number,
  message: string,
  timeoutMs = 5_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let received = Buffer.alloc(0);
    const socket = connect(port, host, () => {
      socket.write(frameMllp(message));
    });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`MLLP ack timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
      const ack = unframeMllp(received);
      if (ack !== null) {
        clearTimeout(timer);
        socket.end();
        resolve(ack);
      }
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
