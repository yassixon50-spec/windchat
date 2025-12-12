import api from './api';
import { ApiResponse } from '../types';

export interface ChatUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string | null;
  type: string;
  createdAt: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  forwardedFrom?: string | null;
  reactions?: string; // JSON: {"❤️": ["userId1"], "👍": ["userId2"]}
  readBy?: string; // JSON array of user IDs who read this message
  sender: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: { firstName: string };
  };
}

export interface Chat {
  id: string;
  type: string;
  name: string | null;
  participants: {
    id: string;
    userId: string;
    user: ChatUser;
  }[];
  messages: Message[];
  updatedAt: string;
  unreadCount?: number;
}

export const chatService = {
  async getChats(): Promise<Chat[]> {
    const response = await api.get<ApiResponse<Chat[]>>('/chats');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get chats');
  },

  async createChat(participantId: string): Promise<Chat> {
    const response = await api.post<ApiResponse<Chat>>('/chats', { participantId });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create chat');
  },

  async getMessages(chatId: string): Promise<Message[]> {
    const response = await api.get<ApiResponse<Message[]>>(`/chats/${chatId}/messages`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get messages');
  },

  async sendMessage(chatId: string, content: string, replyToId?: string, scheduledAt?: Date, expiresIn?: number): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(`/chats/${chatId}/messages`, { 
      content, 
      replyToId,
      scheduledAt: scheduledAt?.toISOString(),
      expiresIn, // seconds until message self-destructs
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to send message');
  },

  async editMessage(chatId: string, messageId: string, content: string): Promise<Message> {
    const response = await api.put<ApiResponse<Message>>(`/chats/${chatId}/messages/${messageId}`, { content });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to edit message');
  },

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    const response = await api.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/chats/${chatId}/messages/${messageId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete message');
    }
  },

  async searchUsers(query: string): Promise<ChatUser[]> {
    const response = await api.get<ApiResponse<ChatUser[]>>(`/users/search?q=${encodeURIComponent(query)}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to search users');
  },

  async markAsRead(chatId: string): Promise<void> {
    await api.post(`/chats/${chatId}/read`);
  },

  async createGroup(name: string, participantIds: string[]): Promise<Chat> {
    const response = await api.post<ApiResponse<Chat>>('/chats/group', { name, participantIds });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create group');
  },

  async uploadFile(file: File): Promise<{ url: string; filename: string; mimetype: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ url: string; filename: string; mimetype: string }>>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to upload file');
  },

  async pinMessage(chatId: string, messageId: string): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(`/chats/${chatId}/messages/${messageId}/pin`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to pin message');
  },

  async getPinnedMessages(chatId: string): Promise<Message[]> {
    const response = await api.get<ApiResponse<Message[]>>(`/chats/${chatId}/pinned`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get pinned messages');
  },

  async forwardMessage(chatId: string, messageId: string, targetChatIds: string[]): Promise<Message[]> {
    const response = await api.post<ApiResponse<Message[]>>(`/chats/${chatId}/messages/${messageId}/forward`, { targetChatIds });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to forward message');
  },

  async searchMessages(chatId: string, query: string): Promise<Message[]> {
    const response = await api.get<ApiResponse<Message[]>>(`/chats/${chatId}/search?q=${encodeURIComponent(query)}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to search messages');
  },

  async reactToMessage(chatId: string, messageId: string, emoji: string): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(`/chats/${chatId}/messages/${messageId}/react`, { emoji });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to react to message');
  },

  async getLinkPreview(url: string): Promise<{ url: string; title: string; description: string; image: string | null; siteName: string }> {
    const response = await api.get<ApiResponse<{ url: string; title: string; description: string; image: string | null; siteName: string }>>(`/preview?url=${encodeURIComponent(url)}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get link preview');
  },

  async deleteChat(chatId: string): Promise<void> {
    const response = await api.delete<ApiResponse<{ deleted: boolean }>>(`/chats/${chatId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete chat');
    }
  },

  async blockUser(chatId: string): Promise<void> {
    const response = await api.post<ApiResponse<{ blocked: boolean }>>(`/chats/${chatId}/block`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to block user');
    }
  },

  async unblockUser(chatId: string): Promise<void> {
    const response = await api.delete<ApiResponse<{ unblocked: boolean }>>(`/chats/${chatId}/block`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to unblock user');
    }
  },

  async getBlockStatus(chatId: string): Promise<{ isBlocked: boolean; blockedByMe: boolean; blockedByOther: boolean }> {
    const response = await api.get<ApiResponse<{ isBlocked: boolean; blockedByMe: boolean; blockedByOther: boolean }>>(`/chats/${chatId}/block-status`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get block status');
  },
};
