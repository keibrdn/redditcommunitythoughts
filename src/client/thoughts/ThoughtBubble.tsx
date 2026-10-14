import type { MouseEvent } from 'react';
import type { Thought, UserState } from '../../shared/api';
import { Avatar } from './Avatar';
import { activateOnKey, hoursLeftLabel, thoughtHandle, totalReactions } from './helpers';

type ThoughtBubbleProps = {
  thought: Thought;
  user: UserState | null;
  isMine?: boolean;
  onOpen: (event: MouseEvent) => void;
};

export const ThoughtBubble = ({ thought, user, isMine = false, onOpen }: ThoughtBubbleProps) => {
  const top = thought.reactions.slice(0, 3);
  const total = totalReactions(thought);
  const handle = thoughtHandle(thought, user);

  return (
    <div
      className={`bubble${isMine ? ' mine' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Thought by u/${handle}: ${thought.text}`}
      onClick={onOpen}
      onKeyDown={(event) => activateOnKey(event, () => {})}
    >
      <div className="bhead">
        <Avatar name={handle} color={isMine ? '#3f8efc' : undefined} />
        <span className="uname">{handle}</span>
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
