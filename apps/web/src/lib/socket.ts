import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3010';

let socket: Socket | null = null;

export function getSocket(): Socket {
  socket ??= io(WS_URL, { transports: ['websocket'] });
  return socket;
}
