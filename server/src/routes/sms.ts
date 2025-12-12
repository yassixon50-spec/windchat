import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { smsService } from '../services/sms';

const router = Router();

// GET /api/sms/chats - Get all SMS chats
router.get('/chats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const chats = await prisma.sMSChat.findMany({
      where: { userId: req.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return successResponse(res, chats);
  } catch (error) {
    console.error('Get SMS chats error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/sms/chats - Create new SMS chat (add contact)
router.post('/chats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { phone, firstName, lastName } = req.body;

    if (!phone || !firstName) {
      return errorResponse(res, 'Phone and first name are required', 400);
    }

    // Format phone
    const formattedPhone = phone.replace(/[\s]/g, '');
    if (!/^\+998[0-9]{9}$/.test(formattedPhone)) {
      return errorResponse(res, 'Invalid phone format. Use +998XXXXXXXXX', 400);
    }

    // Check if chat already exists
    const existing = await prisma.sMSChat.findUnique({
      where: {
        userId_phone: {
          userId: req.userId!,
          phone: formattedPhone,
        },
      },
    });

    if (existing) {
      return successResponse(res, existing);
    }

    // Create new SMS chat
    const chat = await prisma.sMSChat.create({
      data: {
        userId: req.userId!,
        phone: formattedPhone,
        firstName,
        lastName,
      },
    });

    return successResponse(res, chat, 201);
  } catch (error) {
    console.error('Create SMS chat error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// GET /api/sms/chats/:id/messages - Get messages for SMS chat
router.get('/chats/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const chat = await prisma.sMSChat.findFirst({
      where: { id, userId: req.userId },
    });

    if (!chat) {
      return errorResponse(res, 'Chat not found', 404);
    }

    const messages = await prisma.sMSMessage.findMany({
      where: { chatId: id },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(res, messages);
  } catch (error) {
    console.error('Get SMS messages error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/sms/chats/:id/messages - Send SMS message
router.post('/chats/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return errorResponse(res, 'Content is required', 400);
    }

    const chat = await prisma.sMSChat.findFirst({
      where: { id, userId: req.userId },
    });

    if (!chat) {
      return errorResponse(res, 'Chat not found', 404);
    }

    // Create message first
    const message = await prisma.sMSMessage.create({
      data: {
        chatId: id,
        content,
        direction: 'OUTGOING',
        status: 'PENDING',
      },
    });

    // Send SMS
    const result = await smsService.send(chat.phone, content);

    // Update message status
    await prisma.sMSMessage.update({
      where: { id: message.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        smsId: result.messageId,
      },
    });

    // Update chat timestamp
    await prisma.sMSChat.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return successResponse(res, {
      ...message,
      status: result.success ? 'SENT' : 'FAILED',
      smsId: result.messageId,
    }, 201);
  } catch (error) {
    console.error('Send SMS error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/sms/webhook - Receive incoming SMS (webhook from SMS provider)
router.post('/webhook', async (req, res) => {
  try {
    const { from, message, timestamp } = req.body;

    if (!from || !message) {
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    // Find all chats with this phone number
    const chats = await prisma.sMSChat.findMany({
      where: { phone: from },
    });

    // Create incoming message for each chat
    for (const chat of chats) {
      await prisma.sMSMessage.create({
        data: {
          chatId: chat.id,
          content: message,
          direction: 'INCOMING',
          status: 'DELIVERED',
        },
      });

      await prisma.sMSChat.update({
        where: { id: chat.id },
        data: { updatedAt: new Date() },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('SMS webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sms/chats/:id - Delete SMS chat
router.delete('/chats/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const chat = await prisma.sMSChat.findFirst({
      where: { id, userId: req.userId },
    });

    if (!chat) {
      return errorResponse(res, 'Chat not found', 404);
    }

    await prisma.sMSChat.delete({ where: { id } });

    return successResponse(res, { deleted: true });
  } catch (error) {
    console.error('Delete SMS chat error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

export default router;
