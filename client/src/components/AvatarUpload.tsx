import { useState, useRef } from 'react';
import { chatService } from '../services/chat';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onUpload?: (url: string) => void;
  editable?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-2xl',
  xl: 'w-32 h-32 text-4xl',
};

export default function AvatarUpload({
  currentAvatar,
  name,
  size = 'md',
  onUpload,
  editable = false,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const { url } = await chatService.uploadFile(file);
      onUpload?.(url);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const displayImage = preview || (currentAvatar ? `http://localhost:3001${currentAvatar}` : null);

  return (
    <div className="relative group">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-[#3390ec] to-[#5eb5fc] flex items-center justify-center text-white font-medium overflow-hidden`}
      >
        {displayImage ? (
          <img src={displayImage} alt={name} className="w-full h-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {editable && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
