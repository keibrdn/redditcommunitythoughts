import { useEffect } from 'react';
import { PICKER_EMOJIS } from './emojis';

type EmojiPickerProps = {
  used: ReadonlySet<string>;
  canAddNew: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export const EmojiPicker = ({ used, canAddNew, onPick, onClose }: EmojiPickerProps) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="emoji-picker" role="dialog" aria-label="Add reaction">
      <div className="emoji-picker-head">
        <span>Add reaction</span>
        <button type="button" className="emoji-picker-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="emoji-picker-grid">
        {PICKER_EMOJIS.map((emoji) => {
          const alreadyUsed = used.has(emoji);
          const disabled = !alreadyUsed && !canAddNew;
          return (
            <button
              key={emoji}
              type="button"
              className={`emoji-picker-cell${alreadyUsed ? ' used' : ''}`}
              disabled={disabled}
              aria-label={`React ${emoji}`}
              onClick={() => {
                if (disabled) return;
                onPick(emoji);
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
};
