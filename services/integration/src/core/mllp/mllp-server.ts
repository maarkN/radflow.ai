import { createServer } from 'node:net';
import type { Server, Socket } from 'node:net';

const VT = 0x0b;
const FS = 0x1c;
const CR = 0x0d;

export type MllpHandler = (rawMessage: string) => Promise<string>;

/**
 * Minimal MLLP (Minimal Lower Layer Protocol) server — the standard transport
 * for HL7 v2: <VT>message<FS><CR>. The handler returns the ACK message, which
 * is framed and written back on the same connection.
 */
export class MllpServer {
  private server: Server | null = null;

  constructor(private readonly handler: MllpHandler) {}

  async listen(port: number): Promise<number> {
    this.server = createServer((socket) => this.handleConnection(socket));
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(port, () => resolve());
    });
    const address = this.server.address();
    return typeof address === 'object' && address ? address.port : port;
  }

  private handleConnection(socket: Socket): void {
    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      void this.drain(socket, () => {
        const start = buffer.indexOf(VT);
        const end = buffer.indexOf(FS);
        if (start === -1 || end === -1 || end < start) {
          return null;
        }
        const raw = buffer.subarray(start + 1, end).toString('utf8');
        const consumedUntil = buffer[end + 1] === CR ? end + 2 : end + 1;
        buffer = buffer.subarray(consumedUntil);
        return raw;
      });
    });
    socket.on('error', () => socket.destroy());
  }

  private async drain(socket: Socket, next: () => string | null): Promise<void> {
    for (let raw = next(); raw !== null; raw = next()) {
      const ack = await this.handler(raw);
      socket.write(Buffer.concat([Buffer.from([VT]), Buffer.from(ack, 'utf8'), Buffer.from([FS, CR])]));
    }
  }

  async close(): Promise<void> {
    if (!this.server) {
      return;
    }
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
  }
}

/** Frames and sends one HL7 message over an existing socket (client side). */
export function frameMllp(message: string): Buffer {
  return Buffer.concat([Buffer.from([VT]), Buffer.from(message, 'utf8'), Buffer.from([FS, CR])]);
}

/** Extracts the first framed message from an MLLP buffer (client side). */
export function unframeMllp(data: Buffer): string | null {
  const start = data.indexOf(VT);
  const end = data.indexOf(FS);
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  return data.subarray(start + 1, end).toString('utf8');
}
