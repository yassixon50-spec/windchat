interface OnlineStatusProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

const sizeClasses = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export default function OnlineStatus({ isOnline, size = 'md', showPulse = true }: OnlineStatusProps) {
  if (!isOnline) return null;

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <div className={`${sizeClasses[size]} bg-[#4dcd5e] rounded-full`} />
      {showPulse && (
        <div className={`absolute inset-0 ${sizeClasses[size]} bg-[#4dcd5e] rounded-full animate-ping opacity-75`} />
      )}
    </div>
  );
}
