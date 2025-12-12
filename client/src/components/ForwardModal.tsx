import { useState } from 'react';
import { Chat, Message, chatService } from '../services/chat';

interface ForwardModalProps {
  message: Message;
  chats: Chat[];
  onClose: () => void;
  onForward: (chatId: string) => void;
}

export default function ForwardModal({ message, chats, onClose, onForward }: ForwardModalProps) {
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const toggleChat = (chatId: string) => {
    setSelectedChats((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const handleForward = async () => {
    if (selectedChats.length === 0) return;
    
    setSending(true);
    try {
      for (const chatId of selectedChats) {
        await chatService.sendMessage(chatId, `↪️ Forwarded: ${message.content}`);
      }
      onForward(selectedChats[0]);
      onClose();
    } catch (error) {
      console.error('Failed to forward message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#17212b] rounded-lg w-[400px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[#0e1621] flex items-center justify-between">
          <h2 className="text-white text-lg font-medium">Forward Message</h2>
          <button onClick={onClose} className="text-[#6c7883] hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-[#0e1621]">
          <div className="bg-[#232e3c] rounded-lg p-3">
            <p className="text-[#6c7883] text-xs mb-1">Message to forward:</p>
            <p className="text-white text-sm truncate">{message.content}</p>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto max-h-[300px]">
          {chats.map((chat) => {
            const isSelected = selectedChats.includes(chat.id);
            const chatName = chat.name || chat.participants[0]?.user.firstName || 'Chat';
            
            return (
              <button
                key={chat.id}
                onClick={() => toggleChat(chat.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[#232e3c] transition-colors ${
                  isSelected ? 'bg-[#232e3c]' : ''
                }`}
              >
                <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white font-medium">
                  {chatName.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">{chatName}</p>
                  <p className="text-[#6c7883] text-sm">
                    {chat.type === 'GROUP' ? `${chat.participants.length} members` : 'Private chat'}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'bg-[#3390ec] border-[#3390ec]' : 'border-[#6c7883]'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#0e1621]">
          <button
            onClick={handleForward}
            disabled={selectedChats.length === 0 || sending}
            className="w-full py-3 bg-[#3390ec] text-white rounded-lg hover:bg-[#2b7fd4] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Forwarding...
              </>
            ) : (
              <>
                Forward to {selectedChats.length} chat{selectedChats.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
