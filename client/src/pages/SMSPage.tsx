import { useState, useEffect, useRef } from 'react';
import { smsService, SMSChat, SMSMessage } from '../services/sms';

export default function SMSPage() {
  const [chats, setChats] = useState<SMSChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SMSChat | null>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ phone: '+998', firstName: '', lastName: '' });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => {
      loadMessages(selectedChat.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedChat?.id]);

  const loadChats = async () => {
    try {
      const data = await smsService.getChats();
      setChats(data);
    } catch (error) {
      console.error('Failed to load SMS chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const data = await smsService.getMessages(chatId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.phone || !newContact.firstName) return;
    try {
      const chat = await smsService.createChat(
        newContact.phone,
        newContact.firstName,
        newContact.lastName || undefined
      );
      setChats((prev) => [chat, ...prev]);
      setSelectedChat(chat);
      setShowAddModal(false);
      setNewContact({ phone: '+998', firstName: '', lastName: '' });
    } catch (error: any) {
      alert(error.message || 'Failed to add contact');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    setSending(true);
    try {
      const message = await smsService.sendMessage(selectedChat.id, newMessage);
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      loadChats(); // Refresh chat list
    } catch (error: any) {
      alert(error.message || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return (
          <svg className="w-4 h-4 text-[#4dcd5e]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
          </svg>
        );
      case 'FAILED':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-[#6c7883] animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        );
    }
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
      <div className="w-[320px] bg-[#17212b] flex flex-col border-r border-[#0e1621]">
        {/* Header */}
        <div className="h-[56px] px-4 flex items-center gap-3 bg-[#17212b]">
          <button
            onClick={() => window.location.href = '/'}
            className="w-10 h-10 flex items-center justify-center text-[#aaaaaa] hover:bg-[#232e3c] rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white text-lg font-medium flex-1">SMS Messages</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 flex items-center justify-center text-[#3390ec] hover:bg-[#232e3c] rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-[80px] h-[80px] rounded-full bg-[#232e3c] flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1">No SMS chats</h3>
              <p className="text-[#6c7883] text-sm mb-4">Add a phone number to start messaging</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-[#3390ec] text-white rounded-lg hover:bg-[#2b7fd4]"
              >
                Add Number
              </button>
            </div>
          ) : (
            chats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const lastMessage = chat.messages?.[0];
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full px-3 py-2 flex items-center gap-3 transition-colors ${
                    isSelected ? 'bg-[#3390ec]' : 'hover:bg-[#232e3c]'
                  }`}
                >
                  <div className="w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#f5a623] to-[#f7931e] flex items-center justify-center text-white text-lg font-medium">
                    {chat.firstName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium truncate">
                        {chat.firstName} {chat.lastName || ''}
                      </span>
                      {lastMessage && (
                        <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#6c7883]'}`}>
                          {formatTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#6c7883]'}`}>
                        {chat.phone}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0e1621]">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-[56px] px-4 flex items-center gap-3 bg-[#17212b]">
              <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#f5a623] to-[#f7931e] flex items-center justify-center text-white font-medium">
                {selectedChat.firstName.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-white font-medium">
                  {selectedChat.firstName} {selectedChat.lastName || ''}
                </h2>
                <p className="text-[#6c7883] text-xs">{selectedChat.phone}</p>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-[#f5a623]/20 rounded-full">
                <svg className="w-4 h-4 text-[#f5a623]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
                </svg>
                <span className="text-[#f5a623] text-xs font-medium">SMS</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-[#182533] px-4 py-2 rounded-lg text-[#6c7883] text-sm">
                    Send your first SMS! 📱
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg) => {
                    const isOutgoing = msg.direction === 'OUTGOING';
                    return (
                      <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[45%] px-3 py-[6px] rounded-lg ${
                            isOutgoing
                              ? 'bg-[#2b5278] text-white rounded-br-sm'
                              : 'bg-[#182533] text-white rounded-bl-sm'
                          }`}
                        >
                          <p className="text-[14px] leading-[1.3125] break-words">{msg.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-[2px] ${isOutgoing ? 'text-[#6eb4f7]' : 'text-[#6c7883]'}`}>
                            <span className="text-[11px]">{formatTime(msg.createdAt)}</span>
                            {isOutgoing && getStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="px-2 py-2 bg-[#17212b]">
              <div className="flex items-center gap-2">
                {/* Emoji Button */}
                <button
                  type="button"
                  className="w-10 h-10 flex items-center justify-center text-[#6c7883] hover:text-white transition-colors"
                  title="Emoji (SMS only supports text)"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                  </svg>
                </button>
                <input
                  type="text"
                  placeholder="Write an SMS..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder-[#6c7883] disabled:opacity-50"
                />
                {newMessage.trim() ? (
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-10 h-10 flex items-center justify-center text-[#3390ec] hover:text-[#5eb5fc] transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    )}
                  </button>
                ) : (
                  <>
                    {/* Voice Message - disabled for SMS */}
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center text-[#6c7883] opacity-50 cursor-not-allowed"
                      title="Voice messages not supported in SMS"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <p className="text-[#6c7883] text-xs text-center mt-2">
                SMS will be sent to {selectedChat.phone}
              </p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-[120px] h-[120px] mx-auto mb-6 rounded-full bg-[#17212b] flex items-center justify-center">
                <svg className="w-16 h-16 text-[#f5a623]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-white text-xl font-light mb-2">SMS Messages</h2>
              <p className="text-[#6c7883]">Send SMS to any phone number</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#17212b] rounded-lg w-[380px] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-medium">Add Phone Number</h2>
              <button
                onClick={() => { setShowAddModal(false); setNewContact({ phone: '+998', firstName: '', lastName: '' }); }}
                className="text-[#6c7883] hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[#6c7883] text-sm mb-2">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="+998901234567"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
                />
              </div>
              <div>
                <label className="block text-[#6c7883] text-sm mb-2">First Name *</label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
                />
              </div>
              <div>
                <label className="block text-[#6c7883] text-sm mb-2">Last Name (optional)</label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  value={newContact.lastName}
                  onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#3390ec]"
                />
              </div>
            </div>

            <button
              onClick={handleAddContact}
              disabled={!newContact.phone || !newContact.firstName}
              className="w-full mt-6 py-3 bg-[#3390ec] text-white rounded-lg hover:bg-[#2b7fd4] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add & Start Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
