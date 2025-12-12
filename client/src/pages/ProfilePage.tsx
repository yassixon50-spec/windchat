import { useState, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { chatService } from '../services/chat';
import { ApiResponse, User } from '../types';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    bio: user?.bio || '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const response = await api.put<ApiResponse<User>>('/users/profile', formData);
      if (response.data.success && response.data.data) {
        updateUser(response.data.data);
        setIsEditing(false);
        addNotification({ type: 'success', message: 'Profile updated successfully!' });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { url } = await chatService.uploadFile(file);
      const response = await api.put<ApiResponse<User>>('/users/profile', { avatar: url });
      if (response.data.success && response.data.data) {
        updateUser(response.data.data);
        addNotification({ type: 'success', message: 'Avatar updated!' });
      }
    } catch (err: any) {
      addNotification({ type: 'error', message: 'Failed to upload avatar' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1621]">
      {/* Header */}
      <div className="h-[56px] px-4 flex items-center gap-3 bg-[#17212b]">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center text-[#aaaaaa] hover:bg-[#232e3c] rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-medium">Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="ml-auto text-[#3390ec] hover:text-[#5eb5fc]"
          >
            Edit
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-[#3390ec] to-[#5eb5fc] flex items-center justify-center text-white text-4xl font-medium overflow-hidden">
              {user?.avatar ? (
                <img src={`http://localhost:3001${user.avatar}`} alt={user.firstName} className="w-full h-full object-cover" />
              ) : (
                user?.firstName.charAt(0)
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploadingAvatar ? (
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <h2 className="text-white text-xl font-medium mt-4">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-[#6c7883]">{user?.phone}</p>
          {user?.username && <p className="text-[#3390ec]">@{user.username}</p>}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#6c7883] text-sm mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
                required
              />
            </div>
            <div>
              <label className="block text-[#6c7883] text-sm mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
              />
            </div>
            <div>
              <label className="block text-[#6c7883] text-sm mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="@username"
                className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
              />
            </div>
            <div>
              <label className="block text-[#6c7883] text-sm mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell something about yourself..."
                rows={3}
                className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec] resize-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-lg bg-[#242f3d] text-white hover:bg-[#2d3a4d] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 rounded-lg bg-[#3390ec] text-white hover:bg-[#2b7fd4] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {user?.bio && (
              <div className="bg-[#17212b] rounded-lg p-4">
                <p className="text-[#6c7883] text-sm mb-1">Bio</p>
                <p className="text-white">{user.bio}</p>
              </div>
            )}
            <div className="bg-[#17212b] rounded-lg p-4">
              <p className="text-[#6c7883] text-sm mb-1">Phone</p>
              <p className="text-white">{user?.phone}</p>
            </div>
            {user?.username && (
              <div className="bg-[#17212b] rounded-lg p-4">
                <p className="text-[#6c7883] text-sm mb-1">Username</p>
                <p className="text-[#3390ec]">@{user.username}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
