import type { MouseEvent } from 'react';
import { useRef } from 'react';
import type { Thought, UserState } from '../../shared/api';
import { ComposeBubble } from './ComposeBubble';
import { ChevronIcon, PlusIcon } from './icons';
import { ThoughtBubble } from './ThoughtBubble';

type ThoughtsBandProps = {
  user: UserState | null;
  myThought: Thought | null;
  others: Thought[];
  onAdd: (event: MouseEvent) => void;
  onOpenThought: (event: MouseEvent, thoughtId: string) => void;
};

const TRAY_STEP = 186;

export const ThoughtsBand = ({
  user,
  myThought,
  others,
  onAdd,
  onOpenThought,
}: ThoughtsBandProps) => {
  const trayRef = useRef<HTMLDivElement>(null);
  const thoughtCount = (myThought ? 1 : 0) + others.length;
  const showArrows = thoughtCount > 2;

  const scrollTray = (direction: -1 | 1) => {
    trayRef.current?.scrollBy({ left: direction * TRAY_STEP, behavior: 'auto' });
  };

  return (
    <section className="thoughts-band">
      <div className="sect">
        <div className="sect-copy">
          <h2>Thoughts</h2>
          <p className="sect-sub">A space for quick notes within the community. Each one lasts 24 hours.</p>
        </div>
        <button
          type="button"
          className="sect-add"
          aria-label={myThought ? 'View your thought' : 'Share a thought'}
          onClick={onAdd}
        >
          <PlusIcon />
        </button>
      </div>
      <div className="tray-wrap">
        {showArrows && (
          <button
            type="button"
            className="tray-arrow left"
            aria-label="Scroll thoughts left"
            onClick={() => scrollTray(-1)}
          >
            <ChevronIcon direction="left" />
          </button>
        )}
        <div className="tray" ref={trayRef}>
          {myThought ? (
            <ThoughtBubble
              thought={myThought}
              user={user}
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
              user={user}
              onOpen={(event) => onOpenThought(event, thought.id)}
            />
          ))}
        </div>
        {showArrows && (
          <button
            type="button"
            className="tray-arrow right"
            aria-label="Scroll thoughts right"
            onClick={() => scrollTray(1)}
          >
            <ChevronIcon direction="right" />
          </button>
        )}
      </div>
    </section>
  );
};
