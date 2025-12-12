import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

// GET /api/contacts - Get all contacts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      include: {
        contact: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/contacts - Add contact
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId, nickname } = req.body;

    if (!contactId) {
      return errorResponse(res, 'Contact ID is required', 400);
    }

    if (contactId === req.userId) {
      return errorResponse(res, 'Cannot add yourself as contact', 400);
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({ where: { id: contactId } });
    if (!userExists) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check if already a contact
    const existing = await prisma.contact.findUnique({
      where: { userId_contactId: { userId: req.userId!, contactId } },
    });
    if (existing) {
      return errorResponse(res, 'Already in contacts', 409);
    }

    const contact = await prisma.contact.create({
      data: {
        userId: req.userId!,
        contactId,
        nickname,
      },
      include: {
        contact: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    });

    return successResponse(res, contact, 201);
  } catch (error) {
    console.error('Add contact error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// PUT /api/contacts/:id - Update contact nickname
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nickname } = req.body;

    const contact = await prisma.contact.findFirst({
      where: { id, userId: req.userId },
    });

    if (!contact) {
      return errorResponse(res, 'Contact not found', 404);
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: { nickname },
      include: {
        contact: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    });

    return successResponse(res, updated);
  } catch (error) {
    console.error('Update contact error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// DELETE /api/contacts/:id - Remove contact
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findFirst({
      where: { id, userId: req.userId },
    });

    if (!contact) {
      return errorResponse(res, 'Contact not found', 404);
    }

    await prisma.contact.delete({ where: { id } });

    return successResponse(res, { deleted: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

export default router;
