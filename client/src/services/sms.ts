import api from './api';
import { ApiResponse } from '../types';

export interface SMSChat {
  id: string;
  userId: string;
  phone: string;
  firstName: string;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: SMSMessage[];
}

export interface SMSMessage {
  id: string;
  chatId: string;
  content: string;
  direction: 'OUTGOING' | 'INCOMING';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  smsId: string | null;
  createdAt: string;
}

export const smsService = {
  async getChats(): Promise<SMSChat[]> {
    const response = await api.get<ApiResponse<SMSChat[]>>('/sms/chats');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get SMS chats');
  },

  async createChat(phone: string, firstName: string, lastName?: string): Promise<SMSChat> {
    const response = await api.post<ApiResponse<SMSChat>>('/sms/chats', {
      phone,
      firstName,
      lastName,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create SMS chat');
  },

  async getMessages(chatId: string): Promise<SMSMessage[]> {
    const response = await api.get<ApiResponse<SMSMessage[]>>(`/sms/chats/${chatId}/messages`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get messages');
  },

  async sendMessage(chatId: string, content: string): Promise<SMSMessage> {
    const response = await api.post<ApiResponse<SMSMessage>>(`/sms/chats/${chatId}/messages`, {
      content,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to send SMS');
  },

  async deleteChat(chatId: string): Promise<void> {
    const response = await api.delete<ApiResponse<{ deleted: boolean }>>(`/sms/chats/${chatId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete chat');
    }
  },
};
