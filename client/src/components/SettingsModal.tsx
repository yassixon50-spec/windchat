import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { chatService } from '../services/chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Telegram-style preset backgrounds
const PRESET_BACKGROUNDS = [
  { id: 'default', name: 'Default', type: 'pattern', value: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23182533\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' },
  { id: 'stars', name: 'Stars', type: 'pattern', value: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%233390ec\' fill-opacity=\'0.15\'%3E%3Cpolygon points=\'10,0 12,7 20,7 14,12 16,20 10,15 4,20 6,12 0,7 8,7\'/%3E%3C/g%3E%3C/svg%3E")' },
  { id: 'dots', name: 'Dots', type: 'pattern', value: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%233390ec\' fill-opacity=\'0.2\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'2\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'2\'/%3E%3C/g%3E%3C/svg%3E")' },
  { id: 'waves', name: 'Waves', type: 'pattern', value: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'20\' viewBox=\'0 0 100 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z\' fill=\'%233390ec\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' },
  { id: 'hearts', name: 'Hearts', type: 'pattern', value: 'url("data:image/svg+xml,%3Csvg width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z\' fill=\'%23e91e63\' fill-opacity=\'0.15\'/%3E%3C/svg%3E")' },
  { id: 'gradient-blue', name: 'Blue Gradient', type: 'gradient', value: 'linear-gradient(135deg, #0e1621 0%, #1a3a5c 50%, #0e1621 100%)' },
  { id: 'gradient-purple', name: 'Purple Gradient', type: 'gradient', value: 'linear-gradient(135deg, #1a1a2e 0%, #4a1a6b 50%, #1a1a2e 100%)' },
  { id: 'gradient-green', name: 'Green Gradient', type: 'gradient', value: 'linear-gradient(135deg, #0e1621 0%, #1a4a3c 50%, #0e1621 100%)' },
  { id: 'gradient-sunset', name: 'Sunset', type: 'gradient', value: 'linear-gradient(135deg, #1a1a2e 0%, #4a2c1a 30%, #6b3a1a 70%, #1a1a2e 100%)' },
  { id: 'gradient-ocean', name: 'Ocean', type: 'gradient', value: 'linear-gradient(180deg, #0e1621 0%, #0d3b66 50%, #1a5276 100%)' },
  { id: 'solid-dark', name: 'Dark', type: 'solid', value: '#0e1621' },
  { id: 'solid-navy', name: 'Navy', type: 'solid', value: '#1a2634' },
  { id: 'solid-charcoal', name: 'Charcoal', type: 'solid', value: '#2d2d2d' },
];

// Chat bubble colors
const BUBBLE_COLORS = [
  { id: 'default', name: 'Default Blue', own: '#2b5278', other: '#182533' },
  { id: 'green', name: 'Green', own: '#2b6b4f', other: '#182533' },
  { id: 'purple', name: 'Purple', own: '#5b3b78', other: '#182533' },
  { id: 'red', name: 'Red', own: '#783b3b', other: '#182533' },
  { id: 'orange', name: 'Orange', own: '#785b2b', other: '#182533' },
  { id: 'pink', name: 'Pink', own: '#783b5b', other: '#182533' },
];

// Font sizes
const FONT_SIZES = [
  { id: 'small', name: 'Small', size: '13px' },
  { id: 'medium', name: 'Medium', size: '14px' },
  { id: 'large', name: 'Large', size: '16px' },
  { id: 'xlarge', name: 'Extra Large', size: '18px' },
];


export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'chat'>('general');
  const [selectedBackground, setSelectedBackground] = useState(() => 
    localStorage.getItem('chatBackground') || 'default'
  );
  const [customBackground, setCustomBackground] = useState<string | null>(() =>
    localStorage.getItem('customChatBackground')
  );
  const [selectedBubbleColor, setSelectedBubbleColor] = useState(() =>
    localStorage.getItem('bubbleColor') || 'default'
  );
  const [fontSize, setFontSize] = useState(() =>
    localStorage.getItem('chatFontSize') || 'medium'
  );
  const [showAnimations, setShowAnimations] = useState(() =>
    localStorage.getItem('showAnimations') !== 'false'
  );
  const [sendWithEnter, setSendWithEnter] = useState(() =>
    localStorage.getItem('sendWithEnter') !== 'false'
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Apply settings to document
    const bg = PRESET_BACKGROUNDS.find(b => b.id === selectedBackground);
    if (customBackground && selectedBackground === 'custom') {
      document.documentElement.style.setProperty('--chat-background', `url(${customBackground})`);
      document.documentElement.style.setProperty('--chat-bg-type', 'image');
    } else if (bg) {
      document.documentElement.style.setProperty('--chat-background', bg.value);
      document.documentElement.style.setProperty('--chat-bg-type', bg.type);
    }
    
    const bubble = BUBBLE_COLORS.find(b => b.id === selectedBubbleColor);
    if (bubble) {
      document.documentElement.style.setProperty('--bubble-own', bubble.own);
      document.documentElement.style.setProperty('--bubble-other', bubble.other);
    }
    
    const font = FONT_SIZES.find(f => f.id === fontSize);
    if (font) {
      document.documentElement.style.setProperty('--chat-font-size', font.size);
    }
  }, [selectedBackground, customBackground, selectedBubbleColor, fontSize]);

  const handleBackgroundSelect = (id: string) => {
    setSelectedBackground(id);
    localStorage.setItem('chatBackground', id);
    if (id !== 'custom') {
      localStorage.removeItem('customChatBackground');
      setCustomBackground(null);
    }
  };

  const handleCustomBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { url } = await chatService.uploadFile(file);
      const fullUrl = `http://localhost:3001${url}`;
      setCustomBackground(fullUrl);
      setSelectedBackground('custom');
      localStorage.setItem('chatBackground', 'custom');
      localStorage.setItem('customChatBackground', fullUrl);
    } catch (error) {
      console.error('Failed to upload background:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBubbleColorSelect = (id: string) => {
    setSelectedBubbleColor(id);
    localStorage.setItem('bubbleColor', id);
  };

  const handleFontSizeSelect = (id: string) => {
    setFontSize(id);
    localStorage.setItem('chatFontSize', id);
  };

  const toggleAnimations = () => {
    const newValue = !showAnimations;
    setShowAnimations(newValue);
    localStorage.setItem('showAnimations', String(newValue));
  };

  const toggleSendWithEnter = () => {
    const newValue = !sendWithEnter;
    setSendWithEnter(newValue);
    localStorage.setItem('sendWithEnter', String(newValue));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'appearance', name: 'Appearance', icon: '🎨' },
    { id: 'chat', name: 'Chat', icon: '💬' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#17212b] rounded-lg w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#0e1621] flex items-center justify-between shrink-0">
          <h2 className="text-white text-lg font-medium">Settings</h2>
          <button onClick={onClose} className="text-[#6c7883] hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#0e1621] shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'text-[#3390ec] border-b-2 border-[#3390ec]' 
                  : 'text-[#6c7883] hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>


        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#232e3c] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3390ec]/20 flex items-center justify-center">
                    {theme === 'dark' ? (
                      <svg className="w-5 h-5 text-[#3390ec]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-[#f5a623]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">Theme</p>
                    <p className="text-[#6c7883] text-sm">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-[#3390ec]' : 'bg-[#4d4d4d]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Notification Sound */}
              <div className="flex items-center justify-between p-3 bg-[#232e3c] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3390ec]/20 flex items-center justify-center">
                    <span className="text-xl">{soundEnabled ? '🔔' : '🔕'}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Notification Sound</p>
                    <p className="text-[#6c7883] text-sm">{soundEnabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
                <button
                  onClick={toggleSound}
                  className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-[#3390ec]' : 'bg-[#4d4d4d]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Send with Enter */}
              <div className="flex items-center justify-between p-3 bg-[#232e3c] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3390ec]/20 flex items-center justify-center">
                    <span className="text-xl">⏎</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Send with Enter</p>
                    <p className="text-[#6c7883] text-sm">{sendWithEnter ? 'Enter sends message' : 'Ctrl+Enter sends'}</p>
                  </div>
                </div>
                <button
                  onClick={toggleSendWithEnter}
                  className={`w-12 h-6 rounded-full transition-colors ${sendWithEnter ? 'bg-[#3390ec]' : 'bg-[#4d4d4d]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${sendWithEnter ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Animations */}
              <div className="flex items-center justify-between p-3 bg-[#232e3c] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3390ec]/20 flex items-center justify-center">
                    <span className="text-xl">✨</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Animations</p>
                    <p className="text-[#6c7883] text-sm">{showAnimations ? 'Smooth animations' : 'Reduced motion'}</p>
                  </div>
                </div>
                <button
                  onClick={toggleAnimations}
                  className={`w-12 h-6 rounded-full transition-colors ${showAnimations ? 'bg-[#3390ec]' : 'bg-[#4d4d4d]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${showAnimations ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="p-3 bg-[#232e3c] rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#3390ec]/20 flex items-center justify-center">
                    <span className="text-xl">⌨️</span>
                  </div>
                  <p className="text-white font-medium">Keyboard Shortcuts</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6c7883]">Search</span>
                    <kbd className="px-2 py-1 bg-[#17212b] rounded text-white text-xs">Ctrl + K</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6c7883]">Settings</span>
                    <kbd className="px-2 py-1 bg-[#17212b] rounded text-white text-xs">Ctrl + ,</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6c7883]">Close</span>
                    <kbd className="px-2 py-1 bg-[#17212b] rounded text-white text-xs">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Chat Background */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>🖼️</span> Chat Background
                </h3>
                
                {/* Custom Background Upload */}
                <div className="mb-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`w-full p-4 border-2 border-dashed rounded-lg transition-colors ${
                      selectedBackground === 'custom' 
                        ? 'border-[#3390ec] bg-[#3390ec]/10' 
                        : 'border-[#3d4d5f] hover:border-[#3390ec]'
                    }`}
                  >
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2 text-[#6c7883]">
                        <div className="w-5 h-5 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </div>
                    ) : customBackground ? (
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-16 h-16 rounded-lg bg-cover bg-center"
                          style={{ backgroundImage: `url(${customBackground})` }}
                        />
                        <div className="text-left">
                          <p className="text-white font-medium">Custom Background</p>
                          <p className="text-[#6c7883] text-sm">Click to change</p>
                        </div>
                        {selectedBackground === 'custom' && (
                          <span className="ml-auto text-[#3390ec]">✓</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#6c7883]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Upload your own background</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomBackground}
                    className="hidden"
                  />
                </div>

                {/* Preset Backgrounds */}
                <p className="text-[#6c7883] text-sm mb-2">Or choose a preset:</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_BACKGROUNDS.map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => handleBackgroundSelect(bg.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedBackground === bg.id 
                          ? 'border-[#3390ec] ring-2 ring-[#3390ec]/50' 
                          : 'border-transparent hover:border-[#3d4d5f]'
                      }`}
                      title={bg.name}
                    >
                      <div 
                        className="w-full h-full"
                        style={{ 
                          background: bg.type === 'solid' ? bg.value : undefined,
                          backgroundImage: bg.type !== 'solid' ? bg.value : undefined,
                          backgroundColor: bg.type !== 'solid' ? '#0e1621' : undefined,
                        }}
                      />
                      {selectedBackground === bg.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-white text-lg">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Bubble Colors */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>💬</span> Message Bubble Color
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {BUBBLE_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => handleBubbleColorSelect(color.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedBubbleColor === color.id 
                          ? 'border-[#3390ec]' 
                          : 'border-transparent hover:border-[#3d4d5f]'
                      } bg-[#232e3c]`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: color.own }}
                        />
                        <span className="text-white text-sm">{color.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <div 
                          className="flex-1 h-4 rounded"
                          style={{ backgroundColor: color.other }}
                        />
                        <div 
                          className="flex-1 h-4 rounded"
                          style={{ backgroundColor: color.own }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>🔤</span> Message Font Size
                </h3>
                <div className="flex gap-2">
                  {FONT_SIZES.map(size => (
                    <button
                      key={size.id}
                      onClick={() => handleFontSizeSelect(size.id)}
                      className={`flex-1 py-2 px-3 rounded-lg transition-all ${
                        fontSize === size.id 
                          ? 'bg-[#3390ec] text-white' 
                          : 'bg-[#232e3c] text-[#6c7883] hover:text-white'
                      }`}
                      style={{ fontSize: size.size }}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {/* Chat Preview */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>👁️</span> Preview
                </h3>
                <div 
                  className="rounded-lg p-4 h-[200px] overflow-hidden"
                  style={{
                    background: selectedBackground === 'custom' && customBackground 
                      ? `url(${customBackground})` 
                      : PRESET_BACKGROUNDS.find(b => b.id === selectedBackground)?.value,
                    backgroundColor: '#0e1621',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex justify-start">
                      <div 
                        className="max-w-[70%] px-3 py-2 rounded-lg text-white"
                        style={{ 
                          backgroundColor: BUBBLE_COLORS.find(b => b.id === selectedBubbleColor)?.other,
                          fontSize: FONT_SIZES.find(f => f.id === fontSize)?.size,
                        }}
                      >
                        Hey! How are you? 👋
                        <div className="text-[10px] text-[#6c7883] text-right mt-1">10:30 AM</div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div 
                        className="max-w-[70%] px-3 py-2 rounded-lg text-white"
                        style={{ 
                          backgroundColor: BUBBLE_COLORS.find(b => b.id === selectedBubbleColor)?.own,
                          fontSize: FONT_SIZES.find(f => f.id === fontSize)?.size,
                        }}
                      >
                        I'm doing great! Thanks for asking 😊
                        <div className="text-[10px] text-white/70 text-right mt-1">10:31 AM ✓✓</div>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div 
                        className="max-w-[70%] px-3 py-2 rounded-lg text-white"
                        style={{ 
                          backgroundColor: BUBBLE_COLORS.find(b => b.id === selectedBubbleColor)?.other,
                          fontSize: FONT_SIZES.find(f => f.id === fontSize)?.size,
                        }}
                      >
                        That's awesome! 🎉
                        <div className="text-[10px] text-[#6c7883] text-right mt-1">10:32 AM</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>⚡</span> Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full p-3 bg-[#232e3c] rounded-lg text-left hover:bg-[#2d3a4d] transition-colors flex items-center gap-3">
                    <span className="text-xl">🗑️</span>
                    <div>
                      <p className="text-white font-medium">Clear All Chats</p>
                      <p className="text-[#6c7883] text-sm">Delete all chat history</p>
                    </div>
                  </button>
                  <button className="w-full p-3 bg-[#232e3c] rounded-lg text-left hover:bg-[#2d3a4d] transition-colors flex items-center gap-3">
                    <span className="text-xl">📥</span>
                    <div>
                      <p className="text-white font-medium">Export Chats</p>
                      <p className="text-[#6c7883] text-sm">Download your chat history</p>
                    </div>
                  </button>
                  <button className="w-full p-3 bg-[#232e3c] rounded-lg text-left hover:bg-[#2d3a4d] transition-colors flex items-center gap-3">
                    <span className="text-xl">🔒</span>
                    <div>
                      <p className="text-white font-medium">Privacy Settings</p>
                      <p className="text-[#6c7883] text-sm">Manage who can see your info</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Storage Info */}
              <div className="p-3 bg-[#232e3c] rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">💾</span>
                  <p className="text-white font-medium">Storage</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6c7883]">Messages</span>
                    <span className="text-white">2.4 MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6c7883]">Media</span>
                    <span className="text-white">15.8 MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6c7883]">Cache</span>
                    <span className="text-white">3.2 MB</span>
                  </div>
                  <div className="h-2 bg-[#17212b] rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-[#3390ec] to-[#5eb5fc]" style={{ width: '21%' }} />
                  </div>
                  <p className="text-[#6c7883] text-xs text-center">21.4 MB of 100 MB used</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
