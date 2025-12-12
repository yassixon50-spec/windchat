import { useState, useEffect, useRef } from 'react';
import { chatService, ChatUser } from '../services/chat';

interface GlobalSearchProps {
  onUserSelect: (userId: string) => void;
  onClose: () => void;
}

type SearchTab = 'users' | 'messages';

export default function GlobalSearch({ onUserSelect, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('users');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        if (activeTab === 'users') {
          const results = await chatService.searchUsers(query);
          setUsers(results);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, activeTab]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-[#17212b] rounded-lg w-[500px] max-h-[70vh] flex flex-col shadow-2xl animate-fade-in">
        {/* Search Input */}
        <div className="p-4 border-b border-[#0e1621]">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search users, messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-[#3390ec]"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <button
              onClick={onClose}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7883] hover:text-white"
            >
              <kbd className="px-2 py-1 bg-[#17212b] rounded text-xs">Esc</kbd>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#0e1621]">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-[#3390ec] border-b-2 border-[#3390ec]'
                : 'text-[#6c7883] hover:text-white'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'text-[#3390ec] border-b-2 border-[#3390ec]'
                : 'text-[#6c7883] hover:text-white'
            }`}
          >
            Messages
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : query && users.length === 0 ? (
            <div className="py-8 text-center text-[#6c7883]">
              No results found for "{query}"
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onUserSelect(user.id);
                  onClose();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#232e3c] transition-colors"
              >
                <div className="relative">
                  <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white font-medium">
                    {user.firstName.charAt(0)}
                  </div>
                  {user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4dcd5e] rounded-full border-2 border-[#17212b]" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-[#6c7883] text-sm">{user.phone}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#0e1621] flex items-center justify-between text-xs text-[#6c7883]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#232e3c] rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#232e3c] rounded">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#232e3c] rounded">Enter</kbd>
              to select
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
