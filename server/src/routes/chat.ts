import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

// GET /api/chats - Get all chats for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId: req.userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: req.userId },
                readBy: { not: { contains: req.userId } },
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform to include unreadCount
    const chatsWithUnread = chats.map((chat: typeof chats[0]) => ({
      ...chat,
      unreadCount: chat._count.messages,
      _count: undefined,
    }));

    return successResponse(res, chatsWithUnread);
  } catch (error) {
    console.error('Get chats error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/chats - Create or get private chat
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return errorResponse(res, 'Participant ID is required', 400);
    }

    // Check if private chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        type: 'PRIVATE',
        AND: [
          { participants: { some: { userId: req.userId } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (existingChat) {
      return successResponse(res, existingChat);
    }

    // Create new private chat
    const chat = await prisma.chat.create({
      data: {
        type: 'PRIVATE',
        participants: {
          create: [
            { userId: req.userId! },
            { userId: participantId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    return successResponse(res, chat, 201);
  } catch (error) {
    console.error('Create chat error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/chats/group - Create group chat
router.post('/group', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, participantIds } = req.body;

    if (!name || !participantIds || participantIds.length < 1) {
      return errorResponse(res, 'Group name and at least 1 participant required', 400);
    }

    const allParticipants = [req.userId!, ...participantIds];

    const chat = await prisma.chat.create({
      data: {
        type: 'GROUP',
        name,
        participants: {
          create: allParticipants.map((userId: string, index: number) => ({
            userId,
            role: index === 0 ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    return successResponse(res, chat, 201);
  } catch (error) {
    console.error('Create group error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// GET /api/chats/:id/messages - Get chat messages
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { cursor, limit = '50' } = req.query;

    const messages = await prisma.message.findMany({
      where: { chatId: id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { firstName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      ...(cursor && {
        cursor: { id: cursor as string },
        skip: 1,
      }),
    });

    return successResponse(res, messages.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/chats/:id/messages - Send message
router.post('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, type = 'TEXT', replyToId, scheduledAt, expiresIn } = req.body;

    if (!content) {
      return errorResponse(res, 'Content is required', 400);
    }

    // Calculate expiration time if self-destruct is enabled
    let expiresAtDate: Date | null = null;
    if (expiresIn && typeof expiresIn === 'number') {
      expiresAtDate = new Date(Date.now() + expiresIn * 1000);
    }

    const message = await prisma.message.create({
      data: {
        chatId: id,
        senderId: req.userId!,
        content,
        type,
        replyToId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        expiresAt: expiresAtDate,
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
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { firstName: true } },
          },
        },
      },
    });

    // Update chat updatedAt
    await prisma.chat.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Socket orqali boshqa foydalanuvchilarga xabar yuborish
    const { getIO } = await import('../lib/socket');
    try {
      const io = getIO();
      // Chat room ga yuborish (chat ochiq bo'lganlar uchun)
      io.to(`chat:${id}`).emit('message:new', message);
      
      // Barcha chat participantlariga ham yuborish (notification uchun)
      const chat = await prisma.chat.findUnique({
        where: { id },
        include: { participants: true },
      });
      if (chat) {
        chat.participants.forEach((p) => {
          if (p.userId !== req.userId) {
            // Har bir participant ga individual yuborish
            io.to(p.userId).emit('message:new', message);
          }
        });
      }
    } catch (e) {
      // Socket not initialized yet, skip broadcast
    }

    return successResponse(res, message, 201);
  } catch (error) {
    console.error('Send message error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// PUT /api/chats/:chatId/messages/:messageId - Edit message
router.put('/:chatId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return errorResponse(res, 'Message not found', 404);
    }
    if (message.senderId !== req.userId) {
      return errorResponse(res, 'Not authorized', 403);
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return successResponse(res, updated);
  } catch (error) {
    console.error('Edit message error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// DELETE /api/chats/:chatId/messages/:messageId - Delete message
router.delete('/:chatId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return errorResponse(res, 'Message not found', 404);
    }
    if (message.senderId !== req.userId) {
      return errorResponse(res, 'Not authorized', 403);
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null },
    });

    return successResponse(res, { id: messageId, deleted: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/chats/:id/read - Mark messages as read
router.post('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get unread messages
    const unreadMessages = await prisma.message.findMany({
      where: {
        chatId: id,
        senderId: { not: req.userId },
        readBy: { not: { contains: req.userId } },
      },
    });

    // Update each message's readBy
    for (const msg of unreadMessages) {
      const readBy = JSON.parse(msg.readBy || '[]');
      if (!readBy.includes(req.userId)) {
        readBy.push(req.userId);
        await prisma.message.update({
          where: { id: msg.id },
          data: { readBy: JSON.stringify(readBy) },
        });
      }
    }

    return successResponse(res, { marked: unreadMessages.length });
  } catch (error) {
    console.error('Mark read error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/chats/:chatId/messages/:messageId/pin - Pin/Unpin message
router.post('/:chatId/messages/:messageId/pin', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, messageId } = req.params;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.chatId !== chatId) {
      return errorResponse(res, 'Message not found', 404);
    }

    // Toggle pin status
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return successResponse(res, updated);
  } catch (error) {
    console.error('Pin message error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// GET /api/chats/:chatId/pinned - Get pinned messages
router.get('/:chatId/pinned', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;

    const pinnedMessages = await prisma.message.findMany({
      where: { chatId, isPinned: true, isDeleted: false },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, pinnedMessages);
  } catch (error) {
    console.error('Get pinned messages error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/chats/:chatId/messages/:messageId/forward - Forward message
router.post('/:chatId/messages/:messageId/forward', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { targetChatIds } = req.body;

    if (!targetChatIds || !Array.isArray(targetChatIds) || targetChatIds.length === 0) {
      return errorResponse(res, 'Target chat IDs required', 400);
    }

    const originalMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { select: { firstName: true } } },
    });

    if (!originalMessage) {
      return errorResponse(res, 'Message not found', 404);
    }

    const forwardedMessages = [];
    for (const targetChatId of targetChatIds) {
      const forwarded = await prisma.message.create({
        data: {
          chatId: targetChatId,
          senderId: req.userId!,
          content: originalMessage.content,
          type: originalMessage.type,
          fileUrl: originalMessage.fileUrl,
          forwardedFrom: originalMessage.sender.firstName,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      });
      forwardedMessages.push(forwarded);

      // Update chat updatedAt
      await prisma.chat.update({
        where: { id: targetChatId },
        data: { updatedAt: new Date() },
      });
    }

    return successResponse(res, forwardedMessages, 201);
  } catch (error) {
    console.error('Forward message error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// GET /api/chats/:chatId/search - Search messages in chat
router.get('/:chatId/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return errorResponse(res, 'Search query required', 400);
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        content: { contains: q },
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return successResponse(res, messages);
  } catch (error) {
    console.error('Search messages error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/chats/:chatId/messages/:messageId/react - Add/remove reaction
router.post('/:chatId/messages/:messageId/react', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return errorResponse(res, 'Emoji is required', 400);
    }

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return errorResponse(res, 'Message not found', 404);
    }

    // Parse existing reactions
    const reactions: Record<string, string[]> = JSON.parse((message as any).reactions || '{}');
    
    // Toggle reaction
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    
    const userIndex = reactions[emoji].indexOf(req.userId!);
    if (userIndex > -1) {
      // Remove reaction
      reactions[emoji].splice(userIndex, 1);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Add reaction
      reactions[emoji].push(req.userId!);
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { reactions: JSON.stringify(reactions) } as any,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return successResponse(res, updated);
  } catch (error) {
    console.error('React to message error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// DELETE /api/chats/:chatId - Delete chat
router.delete('/:chatId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;

    // Check if user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: req.userId },
    });

    if (!participant) {
      return errorResponse(res, 'Not authorized', 403);
    }

    // Delete chat and all messages (cascade)
    await prisma.chat.delete({
      where: { id: chatId },
    });

    return successResponse(res, { deleted: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/chats/:chatId/block - Block user in chat
router.post('/:chatId/block', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;

    // Get the other user in private chat
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat || chat.type !== 'PRIVATE') {
      return errorResponse(res, 'Can only block in private chats', 400);
    }

    const otherParticipant = chat.participants.find((p) => p.userId !== req.userId);
    if (!otherParticipant) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: req.userId!,
          blockedId: otherParticipant.userId,
        },
      },
    });

    if (existingBlock) {
      return errorResponse(res, 'User already blocked', 400);
    }

    // Create block
    await prisma.block.create({
      data: {
        blockerId: req.userId!,
        blockedId: otherParticipant.userId,
      },
    });

    return successResponse(res, { blocked: true, blockedUserId: otherParticipant.userId });
  } catch (error) {
    console.error('Block user error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// DELETE /api/chats/:chatId/block - Unblock user
router.delete('/:chatId/block', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;

    // Get the other user in private chat
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat || chat.type !== 'PRIVATE') {
      return errorResponse(res, 'Can only unblock in private chats', 400);
    }

    const otherParticipant = chat.participants.find((p) => p.userId !== req.userId);
    if (!otherParticipant) {
      return errorResponse(res, 'User not found', 404);
    }

    // Delete block
    await prisma.block.deleteMany({
      where: {
        blockerId: req.userId!,
        blockedId: otherParticipant.userId,
      },
    });

    return successResponse(res, { unblocked: true });
  } catch (error) {
    console.error('Unblock user error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// GET /api/chats/:chatId/block-status - Check block status
router.get('/:chatId/block-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat || chat.type !== 'PRIVATE') {
      return successResponse(res, { isBlocked: false, blockedByMe: false, blockedByOther: false });
    }

    const otherParticipant = chat.participants.find((p) => p.userId !== req.userId);
    if (!otherParticipant) {
      return successResponse(res, { isBlocked: false, blockedByMe: false, blockedByOther: false });
    }

    // Check if I blocked them
    const blockedByMe = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: req.userId!,
          blockedId: otherParticipant.userId,
        },
      },
    });

    // Check if they blocked me
    const blockedByOther = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: otherParticipant.userId,
          blockedId: req.userId!,
        },
      },
    });

    return successResponse(res, {
      isBlocked: !!blockedByMe || !!blockedByOther,
      blockedByMe: !!blockedByMe,
      blockedByOther: !!blockedByOther,
    });
  } catch (error) {
    console.error('Check block status error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

export default router;
