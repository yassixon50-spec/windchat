import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import usersRoutes from './routes/users';
import uploadRoutes from './routes/upload';
import contactsRoutes from './routes/contacts';
import smsRoutes from './routes/sms';
import previewRoutes from './routes/preview';
import prisma from './lib/prisma';
import { setIO } from './lib/socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS origins - multiple origins support
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3001',
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket.io instance ni global qilish
setIO(io);

// Trust proxy (for production behind reverse proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d', // Cache for 1 day
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/preview', previewRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Socket.io - Online users tracking
const onlineUsers = new Map<string, string>(); // oderId -> oderId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their ID
  socket.on('user:online', async (userId: string) => {
    onlineUsers.set(socket.id, userId);
    socket.join(userId);
    
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    }).catch(() => {});

    io.emit('user:status', { oderId: userId, isOnline: true });
  });

  // Join chat room
  socket.on('chat:join', (chatId: string) => {
    socket.join(`chat:${chatId}`);
  });

  // Leave chat room
  socket.on('chat:leave', (chatId: string) => {
    socket.leave(`chat:${chatId}`);
  });

  // Send message
  socket.on('message:send', async (data: { chatId: string; content: string; senderId: string }) => {
    try {
      const message = await prisma.message.create({
        data: {
          chatId: data.chatId,
          senderId: data.senderId,
          content: data.content,
          type: 'TEXT',
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      await prisma.chat.update({
        where: { id: data.chatId },
        data: { updatedAt: new Date() },
      });

      io.to(`chat:${data.chatId}`).emit('message:new', message);
    } catch (error) {
      console.error('Socket message error:', error);
    }
  });

  // Typing indicator
  socket.on('typing:start', (data: { chatId: string; userId: string; userName: string }) => {
    socket.to(`chat:${data.chatId}`).emit('typing:start', data);
  });

  socket.on('typing:stop', (data: { chatId: string; userId: string }) => {
    socket.to(`chat:${data.chatId}`).emit('typing:stop', data);
  });

  // Message read receipt
  socket.on('message:read', async (data: { chatId: string; messageIds: string[]; userId: string }) => {
    try {
      for (const messageId of data.messageIds) {
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (message) {
          const readBy = JSON.parse(message.readBy || '[]');
          if (!readBy.includes(data.userId)) {
            readBy.push(data.userId);
            await prisma.message.update({
              where: { id: messageId },
              data: { readBy: JSON.stringify(readBy) },
            });
          }
        }
      }
      // Notify sender that messages were read
      socket.to(`chat:${data.chatId}`).emit('message:read', { 
        chatId: data.chatId, 
        messageIds: data.messageIds, 
        readBy: data.userId 
      });
    } catch (error) {
      console.error('Read receipt error:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      onlineUsers.delete(socket.id);
      
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      }).catch(() => {});

      io.emit('user:status', { userId, isOnline: false });
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  
  // Close socket connections
  io.close();
  
  // Close database connection
  await prisma.$disconnect();
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, io };
