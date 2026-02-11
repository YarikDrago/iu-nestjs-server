import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UpdatesService } from './updates.service';
import { OnModuleInit } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/updates',
  cors: {
    origin: ['http://localhost:6600', 'http://localhost:3000'],
    credentials: true,
  },
})
export class UpdatesGateway implements OnGatewayConnection, OnModuleInit {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly updatesService: UpdatesService) {}

  onModuleInit() {
    this.updatesService.lastUpdateAt$.subscribe((lastUpdateAt) => {
      this.server.emit('lastUpdate', { lastUpdateAt });
    });
  }

  handleConnection(client: Socket) {
    const lastUpdateAt = this.updatesService.getLastUpdateAt();
    client.emit('lastUpdate', { lastUpdateAt });
  }
}