import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { connect, StringCodec } from 'nats';
import type { NatsConnection } from 'nats';
import { Server } from 'socket.io';
import type { EnvDto } from '../../config/env.dto';

const codec = StringCodec();

/**
 * Bridges NATS to the browser: every radflow.* event is re-emitted to all
 * connected cockpit clients as a `study.event` socket.io message.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: true } })
export class EventsGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private connection: NatsConnection | null = null;

  constructor(@Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>) {}

  async onModuleInit(): Promise<void> {
    this.connection = await connect({
      servers: this.config.get('NATS_URL', { infer: true }),
    });
    const subscription = this.connection.subscribe('radflow.>');
    void (async () => {
      for await (const message of subscription) {
        try {
          this.server.emit('study.event', {
            subject: message.subject,
            envelope: JSON.parse(codec.decode(message.data)),
          });
        } catch {
          // A malformed message must not kill the bridge loop.
        }
      }
    })();
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.drain();
    this.connection = null;
  }
}
