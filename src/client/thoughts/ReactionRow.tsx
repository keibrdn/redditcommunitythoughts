import { useEffect, useRef, useState } from 'react';
import { MAX_REACTION_EMOJIS } from '../../shared/api';
import type { Thought } from '../../shared/api';
import { EmojiPicker } from './EmojiPicker';
import { PlusIcon, SmileIcon } from './icons';

type ReactionRowProps = {
  thought: Thought;
  onReact: (emoji: string) => void;
};

export const ReactionRow = ({ thought, onReact }: ReactionRowProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const used = new Set(thought.reactions.map((reaction) => reaction.emoji));
  const canAddNew = used.size < MAX_REACTION_EMOJIS;

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointer = (event: PointerEvent) => {
      const block = blockRef.current;
      if (!block) return;
      if (event.target instanceof Node && block.contains(event.target)) return;
      setPickerOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [pickerOpen]);

  return (
    <div className="react-block" ref={blockRef}>
      {pickerOpen && (
        <EmojiPicker
          used={used}
          canAddNew={canAddNew}
          onPick={(emoji) => {
            onReact(emoji);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <div className="react-row">
        {thought.reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            className={`react-chip${reaction.userVoted ? ' on' : ''}`}
            aria-label={`React ${reaction.emoji}`}
            aria-pressed={reaction.userVoted}
            onClick={() => onReact(reaction.emoji)}
          >
            <span className="emj">{reaction.emoji}</span>
            <span className="cnt">{reaction.count}</span>
          </button>
        ))}
        {canAddNew && (
          <button
            type="button"
            className={`react-chip add${pickerOpen ? ' on' : ''}`}
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
          >
            <span className="add-icons">
              <SmileIcon size={16} />
              <PlusIcon size={13} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
