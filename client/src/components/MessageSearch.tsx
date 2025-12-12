import { useState, useEffect, useRef } from 'react';
import { Message } from '../services/chat';

interface MessageSearchProps {
  messages: Message[];
  onResultClick: (messageId: string) => void;
  onClose: () => void;
}

export default function MessageSearch({ messages, onResultClick, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = messages.filter(
      (msg) =>
        msg.content &&
        !msg.isDeleted &&
        msg.content.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query, messages]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-[#3390ec]/50 text-white">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="absolute top-0 left-0 right-0 bg-[#17212b] z-20 border-b border-[#0e1621]">
      <div className="h-[56px] px-4 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-[#6c7883] hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-[#242f3d] text-white rounded-lg px-4 py-2 outline-none placeholder-[#6c7883]"
        />
        {query && (
          <span className="text-[#6c7883] text-sm">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="max-h-[300px] overflow-y-auto">
          {results.map((msg) => (
            <button
              key={msg.id}
              onClick={() => {
                onResultClick(msg.id);
                onClose();
              }}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-[#232e3c] text-left"
            >
              <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-[#7b68ee] to-[#9370db] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {msg.sender.firstName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium">{msg.sender.firstName}</span>
                  <span className="text-[#6c7883] text-xs">{formatDate(msg.createdAt)}</span>
                </div>
                <p className="text-[#aaaaaa] text-sm truncate">
                  {highlightText(msg.content || '', query)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div className="p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-[#6c7883] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-[#6c7883]">No messages found</p>
        </div>
      )}
    </div>
  );
}
