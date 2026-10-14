import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Thought, UserState } from '../../shared/api';
import { Avatar } from './Avatar';
import { hoursLeftLabel } from './helpers';
import { CloseIcon, MoreIcon } from './icons';
import { ReactionRow } from './ReactionRow';

type ThoughtViewerProps = {
  thoughts: Thought[];
  startId: string;
  user: UserState | null;
  onClose: (event?: MouseEvent) => void;
  onMenu: (thought: Thought) => void;
  onReact: (thoughtId: string, emoji: string) => void;
};

export const ThoughtViewer = ({
  thoughts,
  startId,
  user,
  onClose,
  onMenu,
  onReact,
}: ThoughtViewerProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [showNeighbors, setShowNeighbors] = useState(reduceMotion);

  useEffect(() => {
    const index = Math.max(
      0,
      thoughts.findIndex((thought) => thought.id === startId),
    );
    requestAnimationFrame(() => {
      const container = carouselRef.current;
      const card = container?.children[index] as HTMLElement | undefined;
      card?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
    });
  }, [startId, thoughts]);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setShowNeighbors(true), 200);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="scrim viewer-scrim open"
      role="dialog"
      aria-modal="true"
      aria-label="Thoughts"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(event);
      }}
    >
      <div
        ref={carouselRef}
        className="vcarousel"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose(event);
        }}
      >
        {thoughts.map((thought) => {
          const isMine = thought.authorId === user?.userId;
          const isFocused = thought.id === startId;
          return (
            <article
              key={thought.id}
              className={`vcard${isFocused || reduceMotion ? '' : ' vcard-side'}${
                !isFocused && showNeighbors ? ' vcard-show' : ''
              }`}
            >
              <div className="sheet-head">
                <button type="button" className="sheet-close" aria-label="Close" onClick={(event) => onClose(event)}>
                  <CloseIcon />
                </button>
                <div className="grow" />
                <button
                  type="button"
                  className="vmenu"
                  aria-label="More options"
                  onClick={() => onMenu(thought)}
                >
                  <MoreIcon />
                </button>
              </div>
              <div className="vwho">
                <Avatar
                  name={isMine ? 'You' : thought.authorName}
                  size={36}
                  color={isMine ? '#3f8efc' : undefined}
                />
                <div className="who">
                  <b>{isMine ? 'Your thought' : `u/${thought.authorName}`}</b>
                </div>
              </div>
              <p className="thought-body">{thought.text}</p>
              <div className="vttl">{hoursLeftLabel(thought.expiresAt)}</div>
              <ReactionRow
                thought={thought}
                onReact={(emoji) => onReact(thought.id, emoji)}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
};
