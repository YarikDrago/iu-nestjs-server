import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UpdatesService } from './updates.service';
import { OnModuleInit } from '@nestjs/common';

interface MatchPredictionUpdatePayload {
  /* Prediction ID */
  id: number;
  user_id: number;
  group_id: number;
  match_id: number;
  home_score: number;
  away_score: number;
}

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
    console.log('WS client connected', client.id);
    const lastUpdateAt = this.updatesService.getLastUpdateAt();
    client.emit('lastUpdate', { lastUpdateAt });
  }

  emitGroupPredictionsUpdated(groupId: number, payload?: any) {
    console.log('Emit group predictions updated (gateway):', groupId);
    this.server.to(`group-${groupId}`).emit('group:predictionsUpdated', {
      groupId,
      ...payload,
    });
  }

  @SubscribeMessage('group:join')
  handleJoinGroupRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: number },
  ): { ok: boolean; error?: string } {
    const roomName = `group-${data.groupId}`;
    client.join(roomName);
    console.log(
      'Client joined group room:',
      data.groupId,
      'socket:',
      client.id,
    );

    /* Send confirmation to client that they joined the group */
    client.emit('group:joined', { groupId: data.groupId });

    /* Send confirmation to client that they joined the group */
    return { ok: true };
  }

  sendGroupPredictionUpdate(payload: MatchPredictionUpdatePayload): void {
    const timestamp = new Date().toISOString();
    console.log('Send group prediction update');
    this.server.to(`group-${payload.group_id}`).emit('group:test', payload);
    console.log(
      'Sent group:test to room',
      `group-${payload.group_id}`,
      'at',
      timestamp,
    );
  }
}
