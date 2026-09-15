import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import type { InitResponse, Thought } from '../shared/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hoursLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h` : `${m}m`;
}

function avatarLetter(name: string): string {
  return (name?.[0] ?? '?').toUpperCase();
}

type AvatarProps = { username: string; size?: number };
const Avatar = ({ username, size = 28 }: AvatarProps) => {
  const colors = [
    'bg-orange-400', 'bg-blue-500', 'bg-green-500',
    'bg-purple-500', 'bg-pink-500', 'bg-yellow-500',
  ];
  const color = colors[username.charCodeAt(0) % colors.length];
  return (
    <div
      className={`${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {avatarLetter(username)}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ThoughtBubble — compact thought preview card
// ---------------------------------------------------------------------------

type ThoughtBubbleProps = { thought: Thought };
const ThoughtBubble = ({ thought }: ThoughtBubbleProps) => {
  const topReactions = thought.reactions.slice(0, 3);
  const totalReactions = thought.reactions.reduce((s, r) => s + r.count, 0);

  return (
    <div className="flex-shrink-0 w-44 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Avatar username={thought.authorName} size={22} />
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
          u/{thought.authorName}
        </span>
      </div>
      <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed">
        {thought.text}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-0.5">
          {topReactions.map((r) => (
            <span key={r.emoji} className="text-xs">{r.emoji}</span>
          ))}
          {totalReactions > 0 && (
            <span className="text-xs text-gray-400 ml-1">{totalReactions}</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{hoursLeft(thought.expiresAt)}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Splash component
// ---------------------------------------------------------------------------

export const Splash = () => {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [postTitle, setPostTitle] = useState('Community Thoughts');
  const [hasNew, setHasNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/init')
      .then((r) => r.json())
      .then((data: InitResponse) => {
        setThoughts(data.thoughts.slice(0, 3));
        setPostTitle(data.config.postTitle ?? 'Community Thoughts');
        setHasNew(data.hasNewThoughts);
      })
      .catch(() => {
        // non-fatal — show empty state
      })
      .finally(() => setLoading(false));
  }, []);

  const open = (e: MouseEvent) => {
    requestExpandedMode(e.nativeEvent, 'game');
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-white dark:bg-gray-900 cursor-pointer"
      onClick={open}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">💭</span>
          <span className="font-bold text-sm text-gray-900 dark:text-white">{postTitle}</span>
        </div>
        {hasNew && (
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            New
          </span>
        )}
      </div>

      {/* Thought bubbles or empty state */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full" />
        </div>
      ) : thoughts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center pb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No thoughts yet — be the first!
          </p>
          <span className="text-xs text-orange-500 font-medium">Tap to open →</span>
        </div>
      ) : (
        <div
          className="flex gap-2 overflow-x-auto px-4 pb-3"
          style={{ scrollbarWidth: 'none' }}
        >
          {thoughts.map((t) => (
            <ThoughtBubble key={t.id} thought={t} />
          ))}
        </div>
      )}

      {/* Footer CTA */}
      <div className="px-4 pb-4 mt-auto">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl py-2 px-3 flex items-center justify-between">
          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            {thoughts.length > 0
              ? `${thoughts.length} thought${thoughts.length !== 1 ? 's' : ''} · Tap to view`
              : 'Share something on your mind'}
          </span>
          <span className="text-orange-500 text-sm">→</span>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>,
);
