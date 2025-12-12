import { User } from '@prisma/client';

export interface UserDTO {
  id: string;
  phone: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  bio: string | null;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: string;
}

export const toUserDTO = (user: User): UserDTO => ({
  id: user.id,
  phone: user.phone,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  bio: user.bio,
  avatar: user.avatar,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen.toISOString(),
});

export interface AuthResponse {
  user: UserDTO;
  token: string;
}

export interface TokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}
