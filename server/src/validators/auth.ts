import { z } from 'zod';

// Phone: +998XXXXXXXXX format (O'zbekiston)
export const phoneSchema = z
  .string()
  .regex(/^\+998[0-9]{9}$/, 'Phone number must be in +998XXXXXXXXX format');

// Password: minimum 8 characters
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

export const registerSchema = z.object({
  phone: phoneSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().max(50).optional(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Validation helper
export const validatePhone = (phone: string): boolean => {
  return phoneSchema.safeParse(phone).success;
};

export const validatePassword = (password: string): boolean => {
  return passwordSchema.safeParse(password).success;
};
