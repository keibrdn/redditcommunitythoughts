import type { MouseEvent } from 'react';
import { Avatar } from './Avatar';
import { PlusIcon } from './icons';
import { activateOnKey } from './helpers';

type ComposeBubbleProps = {
  username: string;
  onOpen: (event: MouseEvent) => void;
};

export const ComposeBubble = ({ username, onOpen }: ComposeBubbleProps) => (
  <div
    className="bubble compose"
    role="button"
    tabIndex={0}
    aria-label="Share a thought"
    onClick={onOpen}
    onKeyDown={(event) => activateOnKey(event, () => {})}
  >
    <div className="bhead">
      <Avatar name={username || 'You'} color="#3f8efc" />
      <span className="uname">You</span>
    </div>
    <div className="cp-mid">
      <span className="cp-plus">
        <PlusIcon size={16} />
      </span>
      <span className="cp-hint">Share a thought…</span>
    </div>
  </div>
);
