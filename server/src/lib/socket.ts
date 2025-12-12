import { Server } from 'socket.io';

let io: Server | null = null;

export function setIO(socketIO: Server) {
  io = socketIO;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
