import { Server } from 'socket.io';

export class WebSocketService {
  private io: Server;
  private static instance: WebSocketService;

  private constructor(io: Server) {
    this.io = io;
  }

  public static getInstance(io?: Server): WebSocketService {
    if (!WebSocketService.instance && io) {
      WebSocketService.instance = new WebSocketService(io);
    }
    return WebSocketService.instance;
  }

  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public sendToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  public joinRoom(socketId: string, room: string): void {
    this.io.sockets.sockets.get(socketId)?.join(room);
  }

  public leaveRoom(socketId: string, room: string): void {
    this.io.sockets.sockets.get(socketId)?.leave(room);
  }
}
