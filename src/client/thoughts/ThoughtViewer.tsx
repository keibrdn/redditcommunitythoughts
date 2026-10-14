import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Thought, UserState } from '../../shared/api';
import { Avatar } from './Avatar';
import { hoursLeftLabel, thoughtHandle } from './helpers';
import { ChevronIcon, CloseIcon, MoreIcon } from './icons';
import { ReactionRow } from './ReactionRow';

type ThoughtViewerProps = {
  thoughts: Thought[];
  startId: string;
  user: UserState | null;
  onClose: (event?: MouseEvent) => void;
  onMenu: (thought: Thought) => void;
  onReact: (thoughtId: string, emoji: string) => void;
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
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
  const thoughtsRef = useRef(thoughts);
  thoughtsRef.current = thoughts;

  const move = useCallback((direction: -1 | 1) => {
    const container = carouselRef.current;
    if (!container) return;
    const cards = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
    if (cards.length < 2) return;
    const containerRect = container.getBoundingClientRect();
    const center = containerRect.left + container.clientWidth / 2;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    const nextCard = cards[Math.min(cards.length - 1, Math.max(0, nearest + direction))];
    if (!nextCard) return;
    const left = nextCard.offsetLeft - (container.clientWidth - nextCard.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
  }, []);

  useLayoutEffect(() => {
    const index = Math.max(
      0,
      thoughtsRef.current.findIndex((thought) => thought.id === startId),
    );
    const container = carouselRef.current;
    const card = container?.children[index];
    if (!(container && card instanceof HTMLElement)) return;
    const left = card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
  }, [startId]);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setShowNeighbors(true), 200);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, onClose]);

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
      {thoughts.length > 1 && (
        <button
          type="button"
          className="viewer-arrow left"
          aria-label="Previous thought"
          onClick={(event) => {
            event.stopPropagation();
            move(-1);
          }}
        >
          <ChevronIcon direction="left" />
        </button>
      )}
      <div
        ref={carouselRef}
        className="vcarousel"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose(event);
        }}
      >
        {thoughts.map((thought) => {
          const isMine = thought.authorId === user?.userId || thought.id === user?.activeThoughtId;
          const isFocused = thought.id === startId;
          const handle = thoughtHandle(thought, user);
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
                <Avatar name={handle} size={36} color={isMine ? '#3f8efc' : undefined} />
                <div className="who">
                  <b>u/{handle}</b>
                </div>
              </div>
              <p className="thought-body">{thought.text}</p>
              <div className="vttl">{hoursLeftLabel(thought.expiresAt)}</div>
              <ReactionRow thought={thought} onReact={(emoji) => onReact(thought.id, emoji)} />
            </article>
          );
        })}
      </div>
      {thoughts.length > 1 && (
        <button
          type="button"
          className="viewer-arrow right"
          aria-label="Next thought"
          onClick={(event) => {
            event.stopPropagation();
            move(1);
          }}
        >
          <ChevronIcon direction="right" />
        </button>
      )}
    </div>
  );
};
