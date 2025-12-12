import { Message } from '../services/chat';

interface MessageActionsProps {
  message: Message;
  isOwn: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onForward: () => void;
  onPin: () => void;
  onCopy: () => void;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function MessageActions({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onPin,
  onCopy,
  position,
  onClose,
}: MessageActionsProps) {
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed bg-[#17212b] rounded-lg shadow-xl py-1 z-50 min-w-[160px] border border-[#232e3c]"
        style={{ left: position.x, top: position.y }}
      >
        <button
          onClick={() => handleAction(onReply)}
          className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
        >
          <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Reply
        </button>

        {isOwn && !message.isDeleted && (
          <button
            onClick={() => handleAction(onEdit)}
            className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}

        {!message.isDeleted && (
          <button
            onClick={() => handleAction(onCopy)}
            className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
        )}

        <button
          onClick={() => handleAction(onForward)}
          className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
        >
          <svg className="w-5 h-5 text-[#6c7883]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Forward
        </button>

        <button
          onClick={() => handleAction(onPin)}
          className="w-full px-4 py-2 text-left text-white hover:bg-[#232e3c] flex items-center gap-3"
        >
          <svg className="w-5 h-5 text-[#6c7883]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
          Pin
        </button>

        {isOwn && !message.isDeleted && (
          <button
            onClick={() => handleAction(onDelete)}
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
  );
}
