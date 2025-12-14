import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

// GET /api/users/search - Search users
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return errorResponse(res, 'Search query is required', 400);
    }

    const searchQuery = q.trim().toLowerCase();
    
    // First try exact phone match
    if (searchQuery.startsWith('+')) {
      const userByPhone = await prisma.user.findFirst({
        where: {
          phone: searchQuery,
          id: { not: req.userId },
        },
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
      });
      
      if (userByPhone) {
        return successResponse(res, [userByPhone]);
      }
    }

    // Search with case-insensitive mode for PostgreSQL
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.userId } },
          {
            OR: [
              { phone: { contains: searchQuery } },
              { firstName: { contains: searchQuery } },
              { lastName: { contains: searchQuery } },
              { username: { contains: searchQuery } },
            ],
          },
        ],
      },
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
      take: 20,
    });

    return successResponse(res, users);
  } catch (error) {
    console.error('Search users error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// PUT /api/users/profile - Update own profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, username, bio, avatar } = req.body;

    // Check username uniqueness if provided
    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: req.userId } },
      });
      if (existing) {
        return errorResponse(res, 'Username already taken', 409);
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        username: username || undefined,
        bio: bio || undefined,
        avatar: avatar || undefined,
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        username: true,
        bio: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    return successResponse(res, user);
  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// GET /api/users/all - Get all users (for debugging)
router.get('/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.userId } },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        isOnline: true,
      },
      take: 50,
    });
    return successResponse(res, users);
  } catch (error) {
    console.error('Get all users error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        username: true,
        bio: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user);
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

export default router;
