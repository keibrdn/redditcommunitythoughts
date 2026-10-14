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
  const [open, setOpen] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const used = new Set(thought.reactions.map((reaction) => reaction.emoji));
  const canAddNew = used.size < MAX_REACTION_EMOJIS;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const block = blockRef.current;
      if (!block) return;
      if (event.target instanceof Node && block.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const pick = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
  };

  return (
    <div className="react-block" ref={blockRef}>
      {open && (
        <EmojiPicker
          used={used}
          canAddNew={canAddNew}
          onPick={pick}
          onClose={() => setOpen(false)}
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
            className={`react-chip add${open ? ' on' : ''}`}
            aria-label="Add reaction"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
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
