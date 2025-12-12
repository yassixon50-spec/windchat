import { Router, Response } from 'express';
import { registerSchema, loginSchema } from '../validators/auth';
import { userService } from '../services/user';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/response';
import { toUserDTO } from '../types';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);
    
    if (!result.success) {
      const details: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        details[err.path.join('.')] = err.message;
      });
      return validationErrorResponse(res, details);
    }

    const { phone, firstName, lastName, password } = result.data;

    // Check if phone already exists
    const existingUser = await userService.findByPhone(phone);
    if (existingUser) {
      // Agar telefon mavjud bo'lsa, parolni tekshirib login qilish
      const isValid = await userService.validatePassword(password, existingUser.password);
      if (isValid) {
        // Parol to'g'ri - avtomatik login
        await userService.updateOnlineStatus(existingUser.id, true);
        const token = generateToken(existingUser.id);
        return successResponse(res, {
          user: toUserDTO(existingUser),
          token,
        });
      } else {
        // Parol noto'g'ri
        return errorResponse(res, 'Phone number already registered. Please login with correct password.', 409);
      }
    }

    // Create user
    const user = await userService.createUser({ phone, firstName, lastName, password });
    
    // Update online status
    await userService.updateOnlineStatus(user.id, true);
    
    // Generate token
    const token = generateToken(user.id);

    return successResponse(res, {
      user: toUserDTO(user),
      token,
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);
    
    if (!result.success) {
      const details: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        details[err.path.join('.')] = err.message;
      });
      return validationErrorResponse(res, details);
    }

    const { phone, password } = result.data;

    // Find user
    const user = await userService.findByPhone(phone);
    if (!user) {
      return errorResponse(res, 'Invalid phone number or password', 401);
    }

    // Validate password
    const isValid = await userService.validatePassword(password, user.password);
    if (!isValid) {
      return errorResponse(res, 'Invalid phone number or password', 401);
    }

    // Update online status
    await userService.updateOnlineStatus(user.id, true);
    
    // Generate token
    const token = generateToken(user.id);

    return successResponse(res, {
      user: toUserDTO(user),
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.findById(req.userId!);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, toUserDTO(user));
  } catch (error) {
    console.error('Get me error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await userService.updateOnlineStatus(req.userId!, false);
    return successResponse(res, { message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
});

export default router;
