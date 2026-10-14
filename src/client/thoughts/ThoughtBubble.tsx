import type { MouseEvent } from 'react';
import type { Thought } from '../../shared/api';
import { Avatar } from './Avatar';
import { activateOnKey, hoursLeftLabel, totalReactions } from './helpers';

type ThoughtBubbleProps = {
  thought: Thought;
  isMine?: boolean;
  onOpen: (event: MouseEvent) => void;
};

export const ThoughtBubble = ({ thought, isMine = false, onOpen }: ThoughtBubbleProps) => {
  const top = thought.reactions.slice(0, 3);
  const total = totalReactions(thought);
  const label = isMine ? 'You' : thought.authorName;

  return (
    <div
      className={`bubble${isMine ? ' mine' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={
        isMine
          ? `Your thought: ${thought.text}. Tap to view or delete.`
          : `Thought by ${thought.authorName}`
      }
      onClick={onOpen}
      onKeyDown={(event) => activateOnKey(event, () => {})}
    >
      <div className="bhead">
        <Avatar name={isMine ? 'You' : thought.authorName} color={isMine ? '#3f8efc' : undefined} />
        <span className="uname">{label}</span>
      </div>
      <p className="pt">{thought.text}</p>
      <div className="bfoot">
        {total > 0 && (
          <div className="rx">
            <span className="rx-stack">
              {top.map((reaction) => (
                <span key={reaction.emoji} className="rx-ic">
                  {reaction.emoji}
                </span>
              ))}
            </span>
            <span className="rx-n">{total}</span>
          </div>
        )}
        <span className="bttl">{hoursLeftLabel(thought.expiresAt)}</span>
      </div>
    </div>
  );
};
