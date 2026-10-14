import type { MouseEvent } from 'react';
import type { Thought, UserState } from '../../shared/api';
import { ComposeBubble } from './ComposeBubble';
import { PlusIcon } from './icons';
import { ThoughtBubble } from './ThoughtBubble';

type ThoughtsBandProps = {
  user: UserState | null;
  myThought: Thought | null;
  others: Thought[];
  onAdd: (event: MouseEvent) => void;
  onOpenThought: (event: MouseEvent, thoughtId: string) => void;
};

export const ThoughtsBand = ({
  user,
  myThought,
  others,
  onAdd,
  onOpenThought,
}: ThoughtsBandProps) => (
  <section className="thoughts-band">
    <div className="sect">
      <h2>Thoughts</h2>
      <div className="grow" />
      <button
        type="button"
        className="sect-add"
        aria-label={myThought ? 'View your thought' : 'Share a thought'}
        onClick={onAdd}
      >
        <PlusIcon />
      </button>
    </div>
    <div className="tray">
      {myThought ? (
        <ThoughtBubble
          thought={myThought}
          isMine
          onOpen={(event) => onOpenThought(event, myThought.id)}
        />
      ) : (
        <ComposeBubble username={user?.username ?? 'You'} onOpen={onAdd} />
      )}
      {others.map((thought) => (
        <ThoughtBubble
          key={thought.id}
          thought={thought}
          onOpen={(event) => onOpenThought(event, thought.id)}
        />
      ))}
    </div>
  </section>
);
