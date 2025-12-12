export interface User {
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

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string>;
}

export interface RegisterData {
  phone: string;
  firstName: string;
  lastName?: string;
  password: string;
}

export interface LoginData {
  phone: string;
  password: string;
}
