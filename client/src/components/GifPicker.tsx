import { useState, useEffect } from 'react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface GiphyGif {
  id: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
    };
  };
  title: string;
}

// Free Giphy API key (limited requests)
const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'gif' | 'sticker'>('gif');

  // Load trending on mount
  useEffect(() => {
    loadTrending();
  }, [activeTab]);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const type = activeTab === 'gif' ? 'gifs' : 'stickers';
      const response = await fetch(
        `https://api.giphy.com/v1/${type}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      );
      const data = await response.json();
      setGifs(data.data);
    } catch (error) {
      console.error('Failed to load trending:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async () => {
    if (!search.trim()) {
      loadTrending();
      return;
    }
    setLoading(true);
    try {
      const type = activeTab === 'gif' ? 'gifs' : 'stickers';
      const response = await fetch(
        `https://api.giphy.com/v1/${type}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(search)}&limit=20&rating=g`
      );
      const data = await response.json();
      setGifs(data.data);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-[340px] bg-[#17212b] rounded-lg shadow-xl border border-[#232e3c] overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-[#232e3c]">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setActiveTab('gif')}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'gif' ? 'bg-[#3390ec] text-white' : 'bg-[#232e3c] text-[#6c7883] hover:text-white'
            }`}
          >
            GIF
          </button>
          <button
            onClick={() => setActiveTab('sticker')}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'sticker' ? 'bg-[#3390ec] text-white' : 'bg-[#232e3c] text-[#6c7883] hover:text-white'
            }`}
          >
            Stickers
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder={`Search ${activeTab === 'gif' ? 'GIFs' : 'Stickers'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
            className="w-full bg-[#242f3d] text-white text-sm rounded-lg px-3 py-2 pl-9 outline-none"
          />
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* GIF Grid */}
      <div className="h-[280px] overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#6c7883] text-sm">
            No {activeTab === 'gif' ? 'GIFs' : 'stickers'} found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => {
                  onSelect(gif.images.fixed_height.url);
                  onClose();
                }}
                className="relative overflow-hidden rounded-lg hover:opacity-80 transition-opacity bg-[#232e3c]"
                style={{ 
                  paddingBottom: `${(parseInt(gif.images.fixed_height.height) / parseInt(gif.images.fixed_height.width)) * 100}%` 
                }}
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt={gif.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t border-[#232e3c] flex items-center justify-between">
        <span className="text-[10px] text-[#6c7883]">Powered by GIPHY</span>
        <button onClick={onClose} className="text-[#6c7883] hover:text-white text-xs">
          Close
        </button>
      </div>
    </div>
  );
}
