import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, RegisterData, LoginData } from '../types';
import { authService } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: (skipConfirm?: boolean) => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Try to get cached user from localStorage for instant load
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      const cachedUser = localStorage.getItem('user');
      
      // If we have both token and cached user, use cached user immediately
      if (token && cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // Invalid cached data
        }
        
        // Then try to refresh user data in background
        try {
          const userData = await authService.getMe();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch {
          // API error - keep using cached user, don't logout
          console.log('Could not refresh user data, using cached');
        }
      } else if (token) {
        // Have token but no cached user - try to get user
        try {
          const userData = await authService.getMe();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch {
          // Token might be invalid, but don't auto-logout
          console.log('Token validation failed');
        }
      } else if (cachedUser) {
        // Have cached user but no token - this shouldn't happen normally
        // Clear the cached user since we can't authenticate
        localStorage.removeItem('user');
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginData) => {
    const response = await authService.login(data);
    setUser(response.user);
    localStorage.setItem('user', JSON.stringify(response.user));
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    setUser(response.user);
    localStorage.setItem('user', JSON.stringify(response.user));
  };

  const logout = async (skipConfirm = false) => {
    // Show confirmation dialog unless skipped
    if (!skipConfirm) {
      const confirmed = window.confirm('Haqiqatan ham chiqmoqchimisiz? / Are you sure you want to logout?');
      if (!confirmed) {
        return;
      }
    }
    
    try {
      await authService.logout();
    } catch {
      // Ignore logout API errors
    }
    
    // Clear all stored data
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
