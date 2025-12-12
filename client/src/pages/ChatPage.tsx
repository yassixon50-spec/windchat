import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useNotification } from '../context/NotificationContext';
import { chatService, Chat, Message, ChatUser } from '../services/chat';
import SettingsModal from '../components/SettingsModal';
import ForwardModal from '../components/ForwardModal';
import MessageSearch from '../components/MessageSearch';
import ProfileEditModal from '../components/ProfileEditModal';

const EmojiPicker = lazy(() => import('../components/EmojiPicker'));
const GifPicker = lazy(() => import('../components/GifPicker'));

// Last seen vaqtini formatlash
function formatLastSeen(lastSeen: string | undefined): string {
  if (!lastSeen) return 'last seen recently';
  
  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMs = now.getTime() - seen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'last seen just now';
  if (diffMins < 60) return `last seen ${diffMins} min ago`;
  if (diffHours < 24) return `last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return `last seen ${seen.toLocaleDateString()}`;
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { joinChat, leaveChat, onNewMessage, startTyping, stopTyping, onTypingStart, onTypingStop, markMessagesRead, onMessageRead, onUserStatus, isConnected } = useSocket();
  const { addNotification } = useNotification();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<ChatUser[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'voice' | 'video' | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addContactPhone, setAddContactPhone] = useState('+998');
  const [addingContact, setAddingContact] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [blockStatus, setBlockStatus] = useState<{ isBlocked: boolean; blockedByMe: boolean; blockedByOther: boolean }>({ isBlocked: false, blockedByMe: false, blockedByOther: false });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    
    const unsubscribe = onNewMessage((message) => {
      if (selectedChat && message.chatId === selectedChat.id) {
        // Faqat boshqa foydalanuvchidan kelgan xabarlarni qo'shish (o'zimiz yuborgan allaqachon qo'shilgan)
        if (message.senderId !== user?.id) {
          setMessages((prev) => {
            // Duplicate bo'lmasligi uchun tekshirish
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      }
      
      // Boshqa foydalanuvchidan kelgan xabar uchun notification
      if (message.senderId !== user?.id) {
        // Faqat boshqa chatda bo'lsa yoki chat ochiq bo'lmasa notification ko'rsat
        const isOtherChat = !selectedChat || message.chatId !== selectedChat.id;
        
        if (isOtherChat) {
          // Browser push notification - har bir xabar uchun unique tag
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`${message.sender.firstName}`, {
              body: message.content || 'New message',
              icon: '/windchat.svg',
              tag: message.id, // Har bir xabar uchun unique
            });
            notification.onclick = () => {
              window.focus();
              const chat = chats.find((c) => c.id === message.chatId);
              if (chat) setSelectedChat(chat);
            };
          }
          
          // In-app notification - har doim ko'rsat
          addNotification({
            type: 'info',
            message: `${message.sender.firstName}: ${message.content?.substring(0, 50) || 'New message'}`,
            duration: 4000,
          });
        }
      }
      
      // Chat listni yangilash (unread count uchun)
      loadChats();
    });
    return unsubscribe;
  }, [selectedChat, onNewMessage, user?.id, chats, addNotification, isConnected]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Typing indicator listeners
  useEffect(() => {
    const unsubStart = onTypingStart((data) => {
      if (data.userId !== user?.id) {
        setTypingUser(data.userName);
      }
    });
    const unsubStop = onTypingStop((data) => {
      if (data.userId !== user?.id) {
        setTypingUser(null);
      }
    });
    return () => {
      unsubStart();
      unsubStop();
    };
  }, [onTypingStart, onTypingStop, user?.id]);

  // User online/offline status listener
  useEffect(() => {
    const unsubscribe = onUserStatus((data) => {
      // Update chat list with new online status
      setChats((prev) => prev.map((chat) => ({
        ...chat,
        participants: chat.participants.map((p) => 
          p.userId === data.userId 
            ? { ...p, user: { ...p.user, isOnline: data.isOnline } }
            : p
        ),
      })));
    });
    return unsubscribe;
  }, [onUserStatus]);

  useEffect(() => {
    if (selectedChat) {
      joinChat(selectedChat.id);
      loadMessages(selectedChat.id);
      loadPinnedMessages(selectedChat.id);
      // Load block status
      chatService.getBlockStatus(selectedChat.id).then(setBlockStatus).catch(() => {
        setBlockStatus({ isBlocked: false, blockedByMe: false, blockedByOther: false });
      });
      // Mark messages as read via API and socket
      chatService.markAsRead(selectedChat.id).then(() => {
        setChats((prev) => prev.map((c) => 
          c.id === selectedChat.id ? { ...c, unreadCount: 0 } : c
        ));
      });
      // Mobile: close sidebar when chat selected
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
    return () => {
      if (selectedChat) {
        leaveChat(selectedChat.id);
        setBlockStatus({ isBlocked: false, blockedByMe: false, blockedByOther: false });
      }
    };
  }, [selectedChat?.id]);

  // Listen for read receipts
  useEffect(() => {
    const unsubscribe = onMessageRead((data) => {
      if (selectedChat && data.chatId === selectedChat.id) {
        setMessages((prev) => prev.map((msg) => {
          if (data.messageIds.includes(msg.id)) {
            const currentReadBy = JSON.parse(msg.readBy || '[]');
            if (!currentReadBy.includes(data.readBy)) {
              currentReadBy.push(data.readBy);
              return { ...msg, readBy: JSON.stringify(currentReadBy) };
            }
          }
          return msg;
        }));
      }
    });
    return unsubscribe;
  }, [selectedChat, onMessageRead]);

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (selectedChat && messages.length > 0 && user) {
      const unreadMessages = messages.filter(
        (msg) => msg.senderId !== user.id && !JSON.parse(msg.readBy || '[]').includes(user.id)
      );
      if (unreadMessages.length > 0) {
        markMessagesRead(selectedChat.id, unreadMessages.map((m) => m.id));
      }
    }
  }, [messages, selectedChat, user, markMessagesRead]);

  // Chat o'zgarganda darhol pastga scroll (animatsiyasiz)
  const isFirstLoad = useRef(true);
  
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      if (isFirstLoad.current) {
        // Birinchi yuklashda - animatsiyasiz, darhol pastga
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        isFirstLoad.current = false;
      } else {
        // Yangi xabar kelganda - smooth scroll
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Chat o'zgarganda reset
  useEffect(() => {
    isFirstLoad.current = true;
  }, [selectedChat?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K - Search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        if (selectedChat) {
          setShowMessageSearch(true);
        }
      }
      // Ctrl + , - Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
      // Escape - Close modals/chat
      if (e.key === 'Escape') {
        if (showChatMenu) setShowChatMenu(false);
        else if (showSettings) setShowSettings(false);
        else if (forwardingMessage) setForwardingMessage(null);
        else if (showMessageSearch) setShowMessageSearch(false);
        else if (showGroupModal) setShowGroupModal(false);
        else if (contextMenu) setContextMenu(null);
        else if (selectedChat && window.innerWidth < 768) {
          setSelectedChat(null);
          setSidebarOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChat, showSettings, forwardingMessage, showMessageSearch, showGroupModal, contextMenu, showChatMenu]);

  // Close chat menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showChatMenu) setShowChatMenu(false);
    };
    if (showChatMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showChatMenu]);

  // Global mouseup/touchend handler for recording - stops recording when mouse/touch released anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isRecording) {
        stopRecording();
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isRecording) {
        stopRecording();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalTouchEnd);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isRecording]);

  const loadChats = async () => {
    try {
      const data = await chatService.getChats();
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const data = await chatService.getMessages(chatId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    
    try {
      if (editingMessage) {
        const updated = await chatService.editMessage(selectedChat.id, editingMessage.id, newMessage);
        setMessages((prev) => prev.map((m) => m.id === editingMessage.id ? updated : m));
        setEditingMessage(null);
      } else {
        const sentMessage = await chatService.sendMessage(selectedChat.id, newMessage, replyTo?.id);
        // Darhol xabarni ko'rsatish (duplicate bo'lmasligi uchun tekshirish)
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMessage.id)) return prev;
          return [...prev, sentMessage];
        });
        setReplyTo(null);
        // Chat listni yangilash
        loadChats();
      }
      setNewMessage('');
      stopTyping(selectedChat.id);
    } catch (error) {
      console.error('Failed to send message:', error);
      addNotification({ type: 'error', message: 'Failed to send message' });
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.content || '');
    setReplyTo(null);
    setContextMenu(null);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleDelete = async (message: Message) => {
    if (!selectedChat) return;
    try {
      await chatService.deleteMessage(selectedChat.id, message.id);
      setMessages((prev) => prev.map((m) => 
        m.id === message.id ? { ...m, isDeleted: true, content: null } : m
      ));
      setContextMenu(null);
      addNotification({ type: 'success', message: 'Message deleted' });
    } catch (error) {
      console.error('Failed to delete message:', error);
      addNotification({ type: 'error', message: 'Failed to delete message' });
    }
  };

  const handlePin = async (message: Message) => {
    if (!selectedChat) return;
    try {
      const updated = await chatService.pinMessage(selectedChat.id, message.id);
      setMessages((prev) => prev.map((m) => m.id === message.id ? updated : m));
      if (updated.isPinned) {
        setPinnedMessages((prev) => [updated, ...prev]);
        addNotification({ type: 'success', message: 'Message pinned' });
      } else {
        setPinnedMessages((prev) => prev.filter((m) => m.id !== message.id));
        addNotification({ type: 'info', message: 'Message unpinned' });
      }
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to pin message:', error);
      addNotification({ type: 'error', message: 'Failed to pin message' });
    }
  };

  const handleForward = (message: Message) => {
    setForwardingMessage(message);
    setContextMenu(null);
  };

  const handleCopy = (message: Message) => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      addNotification({ type: 'success', message: 'Copied to clipboard' });
    }
    setContextMenu(null);
  };

  // Reaction handler
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedChat) return;
    try {
      const updated = await chatService.reactToMessage(selectedChat.id, messageId, emoji);
      setMessages((prev) => prev.map((m) => m.id === messageId ? updated : m));
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Failed to react:', error);
      addNotification({ type: 'error', message: 'Failed to add reaction' });
    }
  };

  // Parse reactions from JSON string
  const parseReactions = (reactionsStr: string | undefined): Record<string, string[]> => {
    if (!reactionsStr) return {};
    try {
      return JSON.parse(reactionsStr);
    } catch {
      return {};
    }
  };

  const loadPinnedMessages = async (chatId: string) => {
    try {
      const pinned = await chatService.getPinnedMessages(chatId);
      setPinnedMessages(pinned);
    } catch (error) {
      console.error('Failed to load pinned messages:', error);
    }
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-[#3390ec]/20');
      setTimeout(() => element.classList.remove('bg-[#3390ec]/20'), 2000);
    }
  };

  const handleAddContact = async () => {
    if (!addContactPhone || addContactPhone.length < 13) {
      addNotification({ type: 'error', message: 'Please enter a valid phone number' });
      return;
    }
    
    setAddingContact(true);
    try {
      // Search for user by phone
      const users = await chatService.searchUsers(addContactPhone);
      if (users.length === 0) {
        addNotification({ 
          type: 'info', 
          message: 'User not registered yet. They need to create an account first.',
          duration: 5000
        });
        return;
      }
      
      // Start chat with found user
      const chat = await chatService.createChat(users[0].id);
      setChats((prev) => [chat, ...prev.filter((c) => c.id !== chat.id)]);
      setSelectedChat(chat);
      setShowAddContact(false);
      setAddContactPhone('+998');
      addNotification({ type: 'success', message: `Chat started with ${users[0].firstName}` });
    } catch (error) {
      console.error('Failed to add contact:', error);
      addNotification({ type: 'error', message: 'Failed to find user' });
    } finally {
      setAddingContact(false);
    }
  };

  // Saved Messages (chat with yourself)
  const startSavedMessages = async () => {
    if (!user) return;
    try {
      const chat = await chatService.createChat(user.id);
      setChats((prev) => [chat, ...prev.filter((c) => c.id !== chat.id)]);
      setSelectedChat(chat);
      addNotification({ type: 'success', message: 'Saved Messages opened' });
    } catch (error) {
      console.error('Failed to open saved messages:', error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    if (message.senderId !== user?.id) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleGifSelect = async (gifUrl: string) => {
    if (!selectedChat) return;
    try {
      await chatService.sendMessage(selectedChat.id, `[GIF]${gifUrl}`, undefined);
      loadMessages(selectedChat.id);
      setShowGifPicker(false);
    } catch (error) {
      console.error('Failed to send GIF:', error);
      addNotification({ type: 'error', message: 'Failed to send GIF' });
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (selectedChat) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!selectedChat) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const { url, filename, mimetype } = await chatService.uploadFile(file);
        const type = mimetype.startsWith('image/') ? 'IMAGE' : 'FILE';
        await chatService.sendMessage(selectedChat.id, type === 'IMAGE' ? url : `📎 ${filename}`, undefined);
      }
      loadMessages(selectedChat.id);
      addNotification({ type: 'success', message: `${files.length} file(s) uploaded` });
    } catch (error) {
      console.error('Failed to upload files:', error);
      addNotification({ type: 'error', message: 'Failed to upload files' });
    } finally {
      setUploading(false);
    }
  };

  const toggleMember = (user: ChatUser) => {
    setSelectedMembers((prev) => 
      prev.find((m) => m.id === user.id)
        ? prev.filter((m) => m.id !== user.id)
        : [...prev, user]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      const chat = await chatService.createGroup(groupName, selectedMembers.map((m) => m.id));
      setChats((prev) => [chat, ...prev]);
      setSelectedChat(chat);
      setShowGroupModal(false);
      setGroupName('');
      setSelectedMembers([]);
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    
    setUploading(true);
    try {
      const { url, filename, mimetype } = await chatService.uploadFile(file);
      const type = mimetype.startsWith('image/') ? 'IMAGE' : 'FILE';
      await chatService.sendMessage(selectedChat.id, type === 'IMAGE' ? url : `📎 ${filename}`, undefined);
      loadMessages(selectedChat.id);
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Voice/Video Recording - Press and Hold
  const startRecording = async (type: 'voice' | 'video') => {
    if (isRecording) return; // Prevent double start
    
    try {
      const constraints = type === 'voice' 
        ? { audio: true } 
        : { audio: true, video: { width: 240, height: 240, facingMode: 'user' } };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      
      const mimeType = type === 'voice' ? 'audio/webm' : 'video/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingType(type);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      addNotification({ type: 'error', message: 'Microphone/Camera access denied' });
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !selectedChat || !isRecording) return;
    
    const currentRecordingType = recordingType;
    const currentChatId = selectedChat.id;
    
    // Clear timer immediately
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { 
          type: currentRecordingType === 'voice' ? 'audio/webm' : 'video/webm' 
        });
        
        // Stop all tracks
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
        
        // Only upload if we have recorded data (at least 0.5 seconds)
        if (recordedChunksRef.current.length > 0 && blob.size > 1000) {
          setUploading(true);
          try {
            const fileName = currentRecordingType === 'voice' ? 'voice.webm' : 'video.webm';
            const file = new File([blob], fileName, { type: blob.type });
            const { url } = await chatService.uploadFile(file);
            const msgType = currentRecordingType === 'voice' ? '🎤 Voice message' : '🎥 Video message';
            await chatService.sendMessage(currentChatId, `${msgType}|${url}`, undefined);
            loadMessages(currentChatId);
            addNotification({ type: 'success', message: currentRecordingType === 'voice' ? 'Voice message sent!' : 'Video message sent!' });
          } catch (error) {
            console.error('Failed to upload recording:', error);
            addNotification({ type: 'error', message: 'Failed to send recording' });
          } finally {
            setUploading(false);
          }
        }
        
        // Reset
        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;
        resolve();
      };
      
      // Reset state before stopping
      setIsRecording(false);
      setRecordingType(null);
      setRecordingTime(0);
      
      mediaRecorderRef.current!.stop();
    });
  };

  const cancelRecording = () => {
    if (!isRecording) return;
    
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Stop media recorder without uploading
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null; // Remove upload handler
      mediaRecorderRef.current.stop();
    }
    
    // Stop all tracks
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    
    // Reset state
    setIsRecording(false);
    setRecordingType(null);
    setRecordingTime(0);
    recordedChunksRef.current = [];
    mediaRecorderRef.current = null;
    
    addNotification({ type: 'info', message: 'Recording cancelled' });
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Typing handler
  const handleTyping = useCallback((value: string) => {
    setNewMessage(value);
    if (!selectedChat) return;
    
    if (value.trim()) {
      startTyping(selectedChat.id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedChat.id);
      }, 2000);
    } else {
      stopTyping(selectedChat.id);
    }
  }, [selectedChat, startTyping, stopTyping]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await chatService.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const startChat = async (oderId: string) => {
    try {
      const chat = await chatService.createChat(oderId);
      setChats((prev) => [chat, ...prev.filter((c) => c.id !== chat.id)]);
      setSelectedChat(chat);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    const other = chat.participants.find((p) => p.userId !== user?.id);
    return other ? `${other.user.firstName} ${other.user.lastName || ''}`.trim() : 'Chat';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'GROUP' && chat.name) {
      return chat.name.charAt(0).toUpperCase();
    }
    const other = chat.participants.find((p) => p.userId !== user?.id);
    return other?.user.firstName.charAt(0).toUpperCase() || 'C';
  };



  const getOtherUser = (chat: Chat) => {
    return chat.participants.find((p) => p.userId !== user?.id)?.user;
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0e1621] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0e1621] flex overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-[320px] bg-[#17212b] flex flex-col border-r border-[#0e1621] absolute md:relative z-30 h-full transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Header */}
        <div className="h-[56px] px-4 flex items-center gap-3 bg-[#17212b] relative">
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 flex items-center justify-center text-[#aaaaaa] hover:bg-[#232e3c] rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </button>
            {showMenu && (
              <div className="absolute top-full left-0 mt-1 bg-[#17212b] rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                <button
                  onClick={() => { startSavedMessages(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-[#3390ec]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                  Saved Messages
                </button>
                <button
                  onClick={() => { setShowGroupModal(true); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  New Group
                </button>
                <button
                  onClick={() => { window.location.href = '/contacts'; setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Contacts
                </button>
                <button
                  onClick={() => { window.location.href = '/sms'; setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-[#f5a623]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
                  </svg>
                  SMS Messages
                </button>
                <button
                  onClick={() => { window.location.href = '/profile'; setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={() => { setShowSettings(true); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={() => { logout(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#232e3c] flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={() => setShowSearch(true)}
              className="w-full bg-[#242f3d] text-white text-sm rounded-full px-4 py-2 pl-10 outline-none placeholder-[#6c7883]"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {/* Add Contact Button */}
          <button
            onClick={() => setShowAddContact(true)}
            className="w-10 h-10 flex items-center justify-center text-[#3390ec] hover:bg-[#232e3c] rounded-full transition-colors"
            title="Add new contact"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search Results */}
        {showSearch && searchResults.length > 0 && (
          <div className="bg-[#17212b] border-b border-[#0e1621]">
            <div className="px-4 py-2 text-xs text-[#6c7883] uppercase">Users</div>
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => startChat(u.id)}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#232e3c] transition-colors"
              >
                <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white font-medium">
                  {u.firstName.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-medium">{u.firstName} {u.lastName}</div>
                  <div className="text-[#6c7883] text-xs">{u.isOnline ? 'online' : 'offline'}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-[100px] h-[100px] rounded-full bg-[#232e3c] flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1">No chats yet</h3>
              <p className="text-[#6c7883] text-sm">Start a new conversation by searching for contacts</p>
            </div>
          ) : (
            chats.map((chat) => {
              const otherUser = getOtherUser(chat);
              const isSelected = selectedChat?.id === chat.id;
              return (
                <button
                  key={chat.id}
                  onClick={() => { setSelectedChat(chat); setShowSearch(false); }}
                  className={`w-full px-3 py-2 flex items-center gap-3 transition-colors ${
                    isSelected ? 'bg-[#3390ec]' : 'hover:bg-[#232e3c]'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-[54px] h-[54px] rounded-full flex items-center justify-center text-white text-lg font-medium overflow-hidden ${
                      isSelected ? 'bg-white/20' : 'bg-gradient-to-br from-[#7b68ee] to-[#9370db]'
                    }`}>
                      {otherUser?.avatar ? (
                        <img src={`http://localhost:3001${otherUser.avatar}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getChatAvatar(chat)
                      )}
                    </div>
                    {otherUser?.isOnline && (
                      <div className={`absolute bottom-0 right-0 w-[14px] h-[14px] rounded-full border-2 ${
                        isSelected ? 'border-[#3390ec] bg-white' : 'border-[#17212b] bg-[#4dcd5e]'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium truncate ${isSelected ? 'text-white' : 'text-white'}`}>
                        {getChatName(chat)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#6c7883]'}`}>
                          {chat.messages[0] && formatTime(chat.messages[0].createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate flex-1 ${isSelected ? 'text-white/70' : 'text-[#6c7883]'}`}>
                        {chat.messages[0]?.content || 'No messages yet'}
                      </p>
                      {chat.unreadCount && chat.unreadCount > 0 && !isSelected && (
                        <span className="ml-2 min-w-[20px] h-[20px] px-1.5 bg-[#3390ec] text-white text-xs font-medium rounded-full flex items-center justify-center">
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* User Profile */}
        <div className="h-[64px] px-4 flex items-center justify-between bg-[#17212b] border-t border-[#0e1621]">
          <button 
            onClick={() => setShowProfileEdit(true)}
            className="flex items-center gap-3 hover:bg-[#232e3c] rounded-lg px-2 py-1.5 transition-colors group"
          >
            <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#3390ec] to-[#5eb5fc] flex items-center justify-center text-white font-medium text-sm overflow-hidden">
              {user?.avatar ? (
                <img src={`http://localhost:3001${user.avatar}`} alt={user.firstName} className="w-full h-full object-cover" />
              ) : (
                user?.firstName.charAt(0)
              )}
            </div>
            <div className="text-left">
              <span className="text-white text-sm font-medium block">{user?.firstName} {user?.lastName || ''}</span>
              <span className="text-[#6c7883] text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit profile
              </span>
            </div>
          </button>
          <button 
            onClick={() => logout()} 
            className="text-[#6c7883] hover:text-white text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        className="flex-1 flex flex-col bg-[#0e1621] relative min-h-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#3390ec]/20 border-2 border-dashed border-[#3390ec] z-50 flex items-center justify-center">
            <div className="bg-[#17212b] px-6 py-4 rounded-lg text-center">
              <svg className="w-12 h-12 text-[#3390ec] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-white font-medium">Drop files here to send</p>
              <p className="text-[#6c7883] text-sm">Images, videos, documents</p>
            </div>
          </div>
        )}
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-[56px] px-4 flex items-center gap-3 bg-[#17212b] relative">
              {/* Mobile back button */}
              <button
                onClick={() => { setSelectedChat(null); setSidebarOpen(true); }}
                className="md:hidden w-10 h-10 flex items-center justify-center text-[#6c7883] hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white font-medium overflow-hidden">
                {getOtherUser(selectedChat)?.avatar ? (
                  <img src={`http://localhost:3001${getOtherUser(selectedChat)?.avatar}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  getChatAvatar(selectedChat)
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-white font-medium">{getChatName(selectedChat)}</h2>
                <p className="text-[#6c7883] text-xs">
                  {typingUser ? (
                    <span className="text-[#3390ec]">{typingUser} is typing...</span>
                  ) : getOtherUser(selectedChat)?.isOnline ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#4dcd5e] rounded-full"></span>
                      online
                    </span>
                  ) : (
                    formatLastSeen(getOtherUser(selectedChat)?.lastSeen)
                  )}
                </p>
              </div>
              {pinnedMessages.length > 0 && (
                <button 
                  onClick={() => setShowPinned(!showPinned)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${showPinned ? 'text-[#3390ec] bg-[#3390ec]/20' : 'text-[#6c7883] hover:bg-[#232e3c]'}`}
                  title={`${pinnedMessages.length} pinned message${pinnedMessages.length > 1 ? 's' : ''}`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                  </svg>
                </button>
              )}
              <button 
                onClick={() => setShowMessageSearch(true)}
                className="w-10 h-10 flex items-center justify-center text-[#6c7883] hover:bg-[#232e3c] rounded-full"
                title="Search messages (Ctrl+K)"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowChatMenu(!showChatMenu); }}
                  className="w-10 h-10 flex items-center justify-center text-[#6c7883] hover:bg-[#232e3c] rounded-full"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
                {showChatMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-[#17212b] rounded-lg shadow-lg py-1 z-50 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setShowMessageSearch(true); setShowChatMenu(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-sm"
                    >
                      <svg className="w-4 h-4 text-[#6c7883]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                      </svg>
                      Search
                    </button>
                    <button
                      onClick={() => { setShowPinned(!showPinned); setShowChatMenu(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3 text-sm"
                    >
                      <svg className="w-4 h-4 text-[#6c7883]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                      </svg>
                      Pinned Messages
                    </button>
                    <div className="border-t border-[#232e3c] my-1"></div>
                    {/* Block/Unblock user */}
                    {selectedChat?.type === 'PRIVATE' && (
                      <button
                        onClick={async () => { 
                          try {
                            if (blockStatus.blockedByMe) {
                              await chatService.unblockUser(selectedChat.id);
                              setBlockStatus({ ...blockStatus, blockedByMe: false, isBlocked: blockStatus.blockedByOther });
                              addNotification({ type: 'success', message: 'User unblocked' });
                            } else {
                              await chatService.blockUser(selectedChat.id);
                              setBlockStatus({ ...blockStatus, blockedByMe: true, isBlocked: true });
                              addNotification({ type: 'success', message: 'User blocked' });
                            }
                          } catch (error) {
                            addNotification({ type: 'error', message: 'Failed to update block status' });
                          }
                          setShowChatMenu(false); 
                        }}
                        className="w-full px-4 py-2 text-left text-orange-400 hover:bg-[#232e3c] flex items-center gap-3 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {blockStatus.blockedByMe ? 'Unblock User' : 'Block User'}
                      </button>
                    )}
                    {/* Delete chat */}
                    <button
                      onClick={async () => { 
                        if (confirm('Delete this chat permanently? This cannot be undone.')) {
                          try {
                            await chatService.deleteChat(selectedChat!.id);
                            setChats((prev) => prev.filter((c) => c.id !== selectedChat!.id));
                            setSelectedChat(null);
                            setSidebarOpen(true);
                            addNotification({ type: 'success', message: 'Chat deleted' });
                          } catch (error) {
                            addNotification({ type: 'error', message: 'Failed to delete chat' });
                          }
                        }
                        setShowChatMenu(false); 
                      }}
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#232e3c] flex items-center gap-3 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Chat
                    </button>
                  </div>
                )}
              </div>
              
              {/* Message Search */}
              {showMessageSearch && (
                <MessageSearch
                  messages={messages}
                  onResultClick={scrollToMessage}
                  onClose={() => setShowMessageSearch(false)}
                />
              )}
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-2 chat-messages-area min-h-0"
              style={{ 
                backgroundImage: 'var(--chat-background)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#0e1621'
              }}
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-[#182533] px-4 py-2 rounded-lg text-[#6c7883] text-sm">
                    No messages yet. Say hello! 👋
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    const isDeleted = msg.isDeleted;
                    const reactions = parseReactions(msg.reactions);
                    const hasReactions = Object.keys(reactions).length > 0;
                    return (
                      <div 
                        key={msg.id}
                        id={`message-${msg.id}`}
                        className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} transition-colors duration-500`}
                        onContextMenu={(e) => { e.preventDefault(); handleContextMenu(e, msg); }}
                        onDoubleClick={(e) => !isDeleted && setShowReactionPicker({ messageId: msg.id, x: e.clientX, y: e.clientY })}
                      >
                        <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <div
                            className={`max-w-[85vw] md:max-w-[400px] px-3 py-[6px] rounded-lg relative text-white ${
                              isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
                            } ${isDeleted ? 'opacity-60' : ''}`}
                            style={{ 
                              backgroundColor: isOwn ? 'var(--bubble-own)' : 'var(--bubble-other)',
                              fontSize: 'var(--chat-font-size)'
                            }}
                          >
                            {/* Pinned indicator */}
                            {msg.isPinned && !isDeleted && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#3390ec] rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                                </svg>
                              </div>
                            )}
                            {/* Forwarded indicator */}
                            {msg.forwardedFrom && !isDeleted && (
                              <div className="flex items-center gap-1 mb-1 text-[#6c7883] text-xs">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                Forwarded from {msg.forwardedFrom}
                              </div>
                            )}
                            {/* Reply preview */}
                            {msg.replyTo && !isDeleted && (
                              <div className={`mb-1 pl-2 border-l-2 ${isOwn ? 'border-[#6eb4f7]' : 'border-[#3390ec]'}`}>
                                <p className={`text-xs font-medium ${isOwn ? 'text-[#6eb4f7]' : 'text-[#3390ec]'}`}>
                                  {msg.replyTo.sender.firstName}
                                </p>
                                <p className="text-xs text-[#aaaaaa] truncate">{msg.replyTo.content}</p>
                              </div>
                            )}
                            {isDeleted ? (
                              <p className="text-[14px] leading-[1.3125] break-words italic">🚫 This message was deleted</p>
                            ) : msg.content?.startsWith('🎤 Voice message|') ? (
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-[#3390ec] flex items-center justify-center">
                                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                  </svg>
                                </div>
                                <audio 
                                  src={`http://localhost:3001${msg.content.split('|')[1]}`} 
                                  controls 
                                  className="h-8 max-w-[200px]"
                                />
                              </div>
                            ) : msg.content?.startsWith('🎥 Video message|') ? (
                              <div className="w-[200px] h-[200px] rounded-full overflow-hidden cursor-pointer" onClick={() => window.open(`http://localhost:3001${msg.content?.split('|')[1]}`, '_blank')}>
                                <video 
                                  src={`http://localhost:3001${msg.content.split('|')[1]}`} 
                                  className="w-full h-full object-cover"
                                  controls
                                />
                              </div>
                            ) : msg.content?.startsWith('/uploads/') ? (
                              <img 
                                src={`http://localhost:3001${msg.content}`} 
                                alt="Shared image" 
                                className="max-w-[300px] rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() => window.open(`http://localhost:3001${msg.content}`, '_blank')}
                              />
                            ) : msg.content?.startsWith('[GIF]') ? (
                              <img 
                                src={msg.content.replace('[GIF]', '')} 
                                alt="GIF" 
                                className="max-w-[250px] rounded-lg"
                              />
                            ) : (
                              <p className="text-[14px] leading-[1.3125] break-words">{msg.content}</p>
                            )}
                            {/* Reactions display */}
                            {hasReactions && !isDeleted && (
                              <div className="flex flex-wrap gap-1 mt-1 -mb-1">
                                {Object.entries(reactions).map(([emoji, userIds]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                                      userIds.includes(user?.id || '') 
                                        ? 'bg-[#3390ec]/30 text-[#3390ec]' 
                                        : 'bg-black/20 text-white/80 hover:bg-black/30'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    {userIds.length > 1 && <span className="text-[10px]">{userIds.length}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className={`flex items-center justify-end gap-1 mt-[2px] ${isOwn ? 'text-[#6eb4f7]' : 'text-[#6c7883]'}`}>
                              {msg.isEdited && !isDeleted && <span className="text-[10px]">edited</span>}
                              <span className="text-[11px]">{formatTime(msg.createdAt)}</span>
                              {isOwn && !isDeleted && (() => {
                                const readByUsers = JSON.parse(msg.readBy || '[]');
                                const isRead = readByUsers.length > 0;
                                return (
                                  <svg className={`w-4 h-4 ${isRead ? 'text-[#34c759]' : 'text-[#6eb4f7]'}`} fill="currentColor" viewBox="0 0 24 24">
                                    {isRead ? (
                                      // Double check - read
                                      <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                                    ) : (
                                      // Double check - sent but not read
                                      <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41z"/>
                                    )}
                                  </svg>
                                );
                              })()}
                            </div>
                          </div>
                          {/* Reply button */}
                          {!isDeleted && (
                            <button
                              onClick={() => handleReply(msg)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[#6c7883] hover:text-white transition-all"
                              title="Reply"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
              
              {/* Reaction Picker */}
              {showReactionPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowReactionPicker(null)} />
                  <div 
                    className="fixed bg-[#17212b] rounded-full shadow-xl p-2 z-50 flex gap-1 border border-[#232e3c]"
                    style={{ 
                      left: Math.min(showReactionPicker.x, window.innerWidth - 280), 
                      top: Math.max(showReactionPicker.y - 50, 10) 
                    }}
                  >
                    {['👍', '❤️', '😂', '😮', '😢', '🔥', '👎'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(showReactionPicker.messageId, emoji)}
                        className="w-9 h-9 flex items-center justify-center text-xl hover:bg-[#232e3c] rounded-full transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Context Menu */}
              {contextMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
                  <div 
                    className="fixed bg-[#17212b] rounded-lg shadow-xl py-1 z-50 min-w-[160px] border border-[#232e3c]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                  >
                    {/* Quick reactions */}
                    {!contextMenu.message.isDeleted && (
                      <div className="px-2 py-2 flex gap-1 border-b border-[#232e3c]">
                        {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => { handleReaction(contextMenu.message.id, emoji); setContextMenu(null); }}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#232e3c] rounded-full transition-transform hover:scale-110"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleReply(contextMenu.message)}
                      className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                    >
                      <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Reply
                    </button>
                    {contextMenu.message.senderId === user?.id && !contextMenu.message.isDeleted && (
                      <button
                        onClick={() => handleEdit(contextMenu.message)}
                        className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                      >
                        <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    )}
                    {!contextMenu.message.isDeleted && (
                      <button
                        onClick={() => handleCopy(contextMenu.message)}
                        className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                      >
                        <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                    )}
                    <button
                      onClick={() => handleForward(contextMenu.message)}
                      className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                    >
                      <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Forward
                    </button>
                    <button
                      onClick={() => handlePin(contextMenu.message)}
                      className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
                    >
                      <svg className="w-5 h-5 text-[#6c7883]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                      </svg>
                      {contextMenu.message.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    {contextMenu.message.senderId === user?.id && !contextMenu.message.isDeleted && (
                      <button
                        onClick={() => handleDelete(contextMenu.message)}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#232e3c] flex items-center gap-3"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Message Input */}
            {blockStatus.isBlocked ? (
              <div className="bg-[#17212b] px-4 py-4 flex items-center justify-center">
                <div className="flex items-center gap-3 text-[#6c7883]">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span className="text-sm">
                    {blockStatus.blockedByOther 
                      ? "You can't send messages to this user" 
                      : "You blocked this user. Unblock to send messages."}
                  </span>
                  {blockStatus.blockedByMe && !blockStatus.blockedByOther && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await chatService.unblockUser(selectedChat!.id);
                          setBlockStatus({ isBlocked: false, blockedByMe: false, blockedByOther: false });
                          addNotification({ type: 'success', message: 'User unblocked' });
                        } catch (error) {
                          addNotification({ type: 'error', message: 'Failed to unblock user' });
                        }
                      }}
                      className="px-3 py-1 bg-[#3390ec] text-white text-sm rounded-lg hover:bg-[#2b7fd4] transition-colors"
                    >
                      Unblock
                    </button>
                  )}
                </div>
              </div>
            ) : (
            <form onSubmit={handleSendMessage} className="bg-[#17212b]">
              {/* Edit Preview */}
              {editingMessage && (
                <div className="px-4 py-2 flex items-center gap-3 border-b border-[#0e1621]">
                  <div className="w-1 h-10 bg-[#f5a623] rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f5a623] text-sm font-medium">Editing message</p>
                    <p className="text-[#aaaaaa] text-sm truncate">{editingMessage.content}</p>
                  </div>
                  <button type="button" onClick={cancelEdit} className="text-[#6c7883] hover:text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {/* Reply Preview */}
              {replyTo && !editingMessage && (
                <div className="px-4 py-2 flex items-center gap-3 border-b border-[#0e1621]">
                  <div className="w-1 h-10 bg-[#3390ec] rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#3390ec] text-sm font-medium">{replyTo.sender.firstName}</p>
                    <p className="text-[#aaaaaa] text-sm truncate">{replyTo.content}</p>
                  </div>
                  <button type="button" onClick={cancelReply} className="text-[#6c7883] hover:text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="px-3 py-3 flex items-center gap-3 relative">
                {/* Emoji Button */}
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                    className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showEmojiPicker ? 'text-[#3390ec] bg-[#3390ec]/20' : 'text-[#6c7883] hover:text-[#3390ec] hover:bg-[#232e3c]'}`}
                    title="Emoji"
                  >
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                    </svg>
                  </button>
                  {showEmojiPicker && (
                    <Suspense fallback={<div className="absolute bottom-full left-0 mb-2 p-4 bg-[#17212b] rounded-lg">Loading...</div>}>
                      <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                    </Suspense>
                  )}
                </div>

                {/* GIF/Sticker Button */}
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                    className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showGifPicker ? 'text-[#3390ec] bg-[#3390ec]/20' : 'text-[#6c7883] hover:text-[#3390ec] hover:bg-[#232e3c]'}`}
                    title="GIF & Stickers"
                  >
                    <span className="text-lg font-bold">GIF</span>
                  </button>
                  {showGifPicker && (
                    <Suspense fallback={<div className="absolute bottom-full left-0 mb-2 p-4 bg-[#17212b] rounded-lg">Loading...</div>}>
                      <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
                    </Suspense>
                  )}
                </div>

                {/* Text Input */}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  className="flex-1 bg-[#242f3d] text-white text-[15px] rounded-full px-4 py-2.5 outline-none placeholder-[#6c7883]"
                />

                {/* File/Media Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-11 h-11 flex items-center justify-center rounded-full text-[#6c7883] hover:text-[#3390ec] hover:bg-[#232e3c] transition-all disabled:opacity-50"
                  title="Attach file"
                >
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                    </svg>
                  )}
                </button>

                {newMessage.trim() ? (
                  /* Send Button */
                  <button 
                    type="submit" 
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-[#3390ec] text-white hover:bg-[#2b7fd4] transition-all"
                    title="Send message"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                ) : (
                  <>
                    {/* Voice Message Button - Press and Hold */}
                    <button 
                      type="button" 
                      onMouseDown={(e) => { e.preventDefault(); startRecording('voice'); }}
                      onMouseUp={(e) => { e.preventDefault(); stopRecording(); }}
                      onTouchStart={(e) => { e.preventDefault(); startRecording('voice'); }}
                      onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`w-11 h-11 flex items-center justify-center rounded-full transition-all select-none ${isRecording && recordingType === 'voice' ? 'text-white bg-red-500 scale-110' : 'text-[#6c7883] hover:text-[#3390ec] hover:bg-[#232e3c]'}`}
                      title="Hold to record voice message"
                    >
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                      </svg>
                    </button>
                    {/* Video Note Button - Press and Hold (Round Video) */}
                    <button 
                      type="button" 
                      onMouseDown={(e) => { e.preventDefault(); startRecording('video'); }}
                      onMouseUp={(e) => { e.preventDefault(); stopRecording(); }}
                      onTouchStart={(e) => { e.preventDefault(); startRecording('video'); }}
                      onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`w-11 h-11 flex items-center justify-center rounded-full transition-all select-none ${isRecording && recordingType === 'video' ? 'text-white bg-red-500 scale-110' : 'text-[#6c7883] hover:text-[#3390ec] hover:bg-[#232e3c]'}`}
                      title="Hold to record video note"
                    >
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
              
              {/* Recording Overlay - Shows while holding button */}
              {isRecording && (
                <div className="absolute inset-0 bg-[#17212b]/95 flex items-center justify-center gap-6 z-10 animate-fade-in">
                  {recordingType === 'video' && (
                    <div className="w-[140px] h-[140px] rounded-full overflow-hidden border-4 border-red-500 shadow-lg shadow-red-500/30">
                      <video ref={videoPreviewRef} className="w-full h-full object-cover scale-[1.2]" muted playsInline autoPlay />
                    </div>
                  )}
                  {recordingType === 'voice' && (
                    <div className="w-[80px] h-[80px] rounded-full bg-red-500/20 flex items-center justify-center">
                      <div className="w-[60px] h-[60px] rounded-full bg-red-500/40 flex items-center justify-center animate-pulse">
                        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white text-2xl font-medium tabular-nums">{formatRecordingTime(recordingTime)}</span>
                    </div>
                    <span className="text-[#6c7883] text-sm">
                      {recordingType === 'voice' ? 'Release to send voice message' : 'Release to send video message'}
                    </span>
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="mt-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              )}
            </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-[160px] h-[160px] mx-auto mb-6 rounded-full bg-[#17212b] flex items-center justify-center">
                <svg className="w-20 h-20 text-[#3390ec]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-white text-2xl font-light mb-2">Welcome to Telegram Clone</h2>
              <p className="text-[#6c7883]">Select a chat to start messaging or search for contacts to begin a new conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#17212b] rounded-lg w-[400px] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#0e1621] flex items-center justify-between">
              <h2 className="text-white text-lg font-medium">New Group</h2>
              <button onClick={() => { setShowGroupModal(false); setSelectedMembers([]); setGroupName(''); }} className="text-[#6c7883] hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec] mb-4"
              />
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
              />
            </div>
            {selectedMembers.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <span key={m.id} className="bg-[#3390ec] text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    {m.firstName}
                    <button onClick={() => toggleMember(m)} className="hover:text-red-300">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleMember(u)}
                  className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-[#232e3c] ${selectedMembers.find((m) => m.id === u.id) ? 'bg-[#232e3c]' : ''}`}
                >
                  <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white font-medium">
                    {u.firstName.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white text-sm font-medium">{u.firstName} {u.lastName}</div>
                  </div>
                  {selectedMembers.find((m) => m.id === u.id) && (
                    <svg className="w-5 h-5 text-[#3390ec]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-[#0e1621]">
              <button
                onClick={createGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="w-full py-3 bg-[#3390ec] text-white rounded-lg hover:bg-[#2b7fd4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Group ({selectedMembers.length} members)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Forward Modal */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          chats={chats}
          onClose={() => setForwardingMessage(null)}
          onForward={(chatId) => {
            addNotification({ type: 'success', message: 'Message forwarded' });
            const chat = chats.find((c) => c.id === chatId);
            if (chat) setSelectedChat(chat);
          }}
        />
      )}

      {/* Pinned Messages Panel */}
      {showPinned && pinnedMessages.length > 0 && (
        <div className="fixed right-0 top-0 bottom-0 w-[320px] bg-[#17212b] border-l border-[#0e1621] z-40 flex flex-col">
          <div className="h-[56px] px-4 flex items-center justify-between border-b border-[#0e1621]">
            <h3 className="text-white font-medium">Pinned Messages ({pinnedMessages.length})</h3>
            <button onClick={() => setShowPinned(false)} className="text-[#6c7883] hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pinnedMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => { scrollToMessage(msg.id); setShowPinned(false); }}
                className="w-full p-4 text-left hover:bg-[#232e3c] border-b border-[#0e1621]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-[#3390ec]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                  </svg>
                  <span className="text-[#3390ec] text-sm font-medium">{msg.sender.firstName}</span>
                </div>
                <p className="text-white text-sm truncate">{msg.content}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#17212b] rounded-lg w-[380px] p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-medium">New Contact</h2>
              <button
                onClick={() => { setShowAddContact(false); setAddContactPhone('+998'); }}
                className="text-[#6c7883] hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[#6c7883] text-sm mb-2">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+998901234567"
                  value={addContactPhone}
                  onChange={(e) => setAddContactPhone(e.target.value)}
                  className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
                />
                <p className="text-[#6c7883] text-xs mt-1">Enter the phone number of a registered user</p>
              </div>
              
              <div className="bg-[#232e3c] rounded-lg p-3">
                <p className="text-[#6c7883] text-xs">
                  💡 <span className="text-white">Tip:</span> The person must have an account. 
                  You can also search by name in the search bar above.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddContact(false); setAddContactPhone('+998'); }}
                className="flex-1 py-3 bg-[#242f3d] text-white rounded-lg hover:bg-[#2d3a4d] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                disabled={addContactPhone.length < 13 || addingContact}
                className="flex-1 py-3 bg-[#3390ec] text-white rounded-lg hover:bg-[#2b7fd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingContact ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find & Chat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal isOpen={showProfileEdit} onClose={() => setShowProfileEdit(false)} />
    </div>
  );
}
