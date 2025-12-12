import api from './api';
import { ApiResponse } from '../types';

export interface ContactUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: string;
}

export interface Contact {
  id: string;
  userId: string;
  contactId: string;
  nickname: string | null;
  createdAt: string;
  contact: ContactUser;
}

export const contactsService = {
  async getContacts(): Promise<Contact[]> {
    const response = await api.get<ApiResponse<Contact[]>>('/contacts');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get contacts');
  },

  async addContact(contactId: string, nickname?: string): Promise<Contact> {
    const response = await api.post<ApiResponse<Contact>>('/contacts', { contactId, nickname });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to add contact');
  },

  async updateContact(id: string, nickname: string): Promise<Contact> {
    const response = await api.put<ApiResponse<Contact>>(`/contacts/${id}`, { nickname });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update contact');
  },

  async deleteContact(id: string): Promise<void> {
    const response = await api.delete<ApiResponse<{ deleted: boolean }>>(`/contacts/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete contact');
    }
  },
};
