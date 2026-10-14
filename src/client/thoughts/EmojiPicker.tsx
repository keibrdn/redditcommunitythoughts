import { useEffect } from 'react';
import { PICKER_EMOJIS, QUICK_EMOJIS } from './emojis';

type EmojiPickerProps = {
  used: ReadonlySet<string>;
  canAddNew: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
};

const quickSet = new Set<string>(QUICK_EMOJIS);
const moreEmojis = PICKER_EMOJIS.filter((emoji) => !quickSet.has(emoji));

export const EmojiPicker = ({ used, canAddNew, onPick, onClose }: EmojiPickerProps) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const renderEmoji = (emoji: string) => {
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
  };

  return (
    <div className="emoji-picker" role="dialog" aria-label="Add reaction">
      <div className="emoji-picker-head">
        <span>Add reaction</span>
        <button type="button" className="emoji-picker-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="emoji-picker-scroll">
        <div className="emoji-picker-common" role="group" aria-label="Common reactions">
          {QUICK_EMOJIS.map(renderEmoji)}
        </div>
        <div className="emoji-picker-grid">{moreEmojis.map(renderEmoji)}</div>
      </div>
    </div>
  );
};
