import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { Message } from '../services/chat';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('user:online', user.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Brauzer yopilganda offline qilish
    const handleBeforeUnload = () => {
      socket.disconnect();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const joinChat = useCallback((chatId: string) => {
    socketRef.current?.emit('chat:join', chatId);
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    socketRef.current?.emit('chat:leave', chatId);
  }, []);

  const sendMessage = useCallback((chatId: string, content: string) => {
    if (!user) return;
    socketRef.current?.emit('message:send', {
      chatId,
      content,
      senderId: user.id,
    });
  }, [user]);

  const startTyping = useCallback((chatId: string) => {
    if (!user) return;
    socketRef.current?.emit('typing:start', {
      chatId,
      userId: user.id,
      userName: user.firstName,
    });
  }, [user]);

  const stopTyping = useCallback((chatId: string) => {
    if (!user) return;
    socketRef.current?.emit('typing:stop', {
      chatId,
      userId: user.id,
    });
  }, [user]);

  const onNewMessage = useCallback((callback: (message: Message) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    
    socket.on('message:new', callback);
    return () => {
      socket.off('message:new', callback);
    };
  }, []);

  const onTypingStart = useCallback((callback: (data: { userId: string; userName: string }) => void) => {
    socketRef.current?.on('typing:start', callback);
    return () => {
      socketRef.current?.off('typing:start', callback);
    };
  }, []);

  const onTypingStop = useCallback((callback: (data: { userId: string }) => void) => {
    socketRef.current?.on('typing:stop', callback);
    return () => {
      socketRef.current?.off('typing:stop', callback);
    };
  }, []);

  // Mark messages as read
  const markMessagesRead = useCallback((chatId: string, messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;
    socketRef.current?.emit('message:read', {
      chatId,
      messageIds,
      userId: user.id,
    });
  }, [user]);

  // Listen for read receipts
  const onMessageRead = useCallback((callback: (data: { chatId: string; messageIds: string[]; readBy: string }) => void) => {
    socketRef.current?.on('message:read', callback);
    return () => {
      socketRef.current?.off('message:read', callback);
    };
  }, []);

  // Listen for user online/offline status changes
  const onUserStatus = useCallback((callback: (data: { userId: string; isOnline: boolean }) => void) => {
    socketRef.current?.on('user:status', callback);
    return () => {
      socketRef.current?.off('user:status', callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinChat,
    leaveChat,
    sendMessage,
    startTyping,
    stopTyping,
    onNewMessage,
    onTypingStart,
    onTypingStop,
    markMessagesRead,
    onMessageRead,
    onUserStatus,
  };
}
