import './index.css';

import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';
import type {
  Config,
  DeleteThoughtResponse,
  ErrorResponse,
  InitResponse,
  ReactResponse,
  SubmitThoughtResponse,
  Thought,
  UserState,
} from '../shared/api';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ErrorResponse).message ?? 'Request failed');
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// TTL helpers
// ---------------------------------------------------------------------------

function hoursLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h left` : `${m}m left`;
}

function avatarLetter(name: string): string {
  return (name?.[0] ?? '?').toUpperCase();
}

// ---------------------------------------------------------------------------
// Avatar component
// ---------------------------------------------------------------------------

type AvatarProps = { username: string; size?: number };
const Avatar = ({ username, size = 36 }: AvatarProps) => {
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
// ReactionRow
// ---------------------------------------------------------------------------

type ReactionRowProps = {
  thought: Thought;
  onReact: (thoughtId: string, emoji: string) => void;
  compact?: boolean;
};

const ReactionRow = ({ thought, onReact, compact = false }: ReactionRowProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleReactions = compact
    ? thought.reactions.slice(0, 3)
    : thought.reactions;

  const handleAddCustom = () => {
    const emoji = customEmoji.trim();
    if (!emoji) return;
    onReact(thought.id, emoji);
    setCustomEmoji('');
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visibleReactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onReact(thought.id, r.emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${
            r.userVoted
              ? 'bg-orange-100 border-orange-400 text-orange-700'
              : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}

      {!compact && (
        <div className="relative">
          <button
            onClick={() => {
              setShowPicker((v) => !v);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-200 text-lg"
            aria-label="Add reaction"
          >
            +
          </button>
          {showPicker && (
            <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex items-center gap-1 z-50">
              <input
                ref={inputRef}
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                placeholder="😊"
                className="w-12 text-center border border-gray-300 rounded-lg px-1 py-0.5 text-lg outline-none"
                maxLength={4}
              />
              <button
                onClick={handleAddCustom}
                className="text-xs bg-orange-500 text-white px-2 py-1 rounded-lg"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Options menu (bottom sheet)
// ---------------------------------------------------------------------------

type OptionsMenuProps = {
  thought: Thought;
  currentUserId: string;
  onClose: () => void;
  onHide: (thoughtId: string) => void;
  onDelete: (thoughtId: string) => void;
  onReport: (thought: Thought) => void;
};

const OptionsMenu = ({
  thought,
  currentUserId,
  onClose,
  onHide,
  onDelete,
  onReport,
}: OptionsMenuProps) => {
  const isOwner = thought.authorId === currentUserId;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl p-4 flex flex-col gap-1 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />

        <button
          className="text-left px-4 py-3 rounded-xl text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
          onClick={() => {
            navigateTo(`https://reddit.com/user/${thought.authorName}`);
            onClose();
          }}
        >
          View profile
        </button>

        <button
          className="text-left px-4 py-3 rounded-xl text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
          onClick={() => {
            onHide(thought.id);
            onClose();
          }}
        >
          Hide this thought
        </button>

        {isOwner && (
          <button
            className="text-left px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium"
            onClick={() => {
              onDelete(thought.id);
              onClose();
            }}
          >
            Delete my thought
          </button>
        )}

        <button
          className="text-left px-4 py-3 rounded-xl text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
          onClick={() => {
            onReport(thought);
            onClose();
          }}
        >
          Report
        </button>

        <button
          className="mt-2 px-4 py-3 rounded-xl text-center text-gray-500 hover:bg-gray-100 text-sm"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DeleteConfirm dialog
// ---------------------------------------------------------------------------

type DeleteConfirmProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

const DeleteConfirm = ({ onConfirm, onCancel }: DeleteConfirmProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl w-full max-w-sm">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete thought?</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        This will permanently remove your thought from the carousel and delete the underlying comment.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-medium text-white hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Submit thought sheet
// ---------------------------------------------------------------------------

type SubmitSheetProps = {
  onSubmit: (text: string) => Promise<void>;
  onClose: () => void;
  submitting: boolean;
};

const SubmitSheet = ({ onSubmit, onClose, submitting }: SubmitSheetProps) => {
  const [text, setText] = useState('');
  const MAX = 280;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">
          Share a thought
        </h3>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX))}
          placeholder="What's on your mind?"
          rows={4}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-800 dark:text-gray-200 dark:bg-gray-700 resize-none outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-xs ${text.length > MAX - 20 ? 'text-orange-500' : 'text-gray-400'}`}
          >
            {MAX - text.length} remaining
          </span>
          <button
            disabled={text.trim().length === 0 || submitting}
            onClick={() => onSubmit(text.trim())}
            className="bg-orange-500 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-orange-600 transition-colors"
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StarterPromptCard
// ---------------------------------------------------------------------------

type StarterPromptCardProps = { prompt: string };
const StarterPromptCard = ({ prompt }: StarterPromptCardProps) => (
  <div className="flex-shrink-0 w-full snap-start">
    <div className="mx-4 my-3 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 dark:bg-orange-900/20 p-5 flex flex-col gap-2">
      <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
        From the mods
      </span>
      <p className="text-base font-medium text-gray-800 dark:text-gray-200">{prompt}</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

type EmptyStateProps = { onShare: () => void };
const EmptyState = ({ onShare }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center flex-1 gap-5 px-8 text-center py-16">
    <div className="text-5xl">💭</div>
    <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
      Be the first to share a thought
    </p>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Thoughts disappear after 24 hours — no pressure.
    </p>
    <button
      onClick={onShare}
      className="bg-orange-500 text-white font-semibold px-6 py-3 rounded-2xl text-sm hover:bg-orange-600 transition-colors shadow-md"
    >
      Share a thought
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// ShareCTA — last card in carousel
// ---------------------------------------------------------------------------

type ShareCTAProps = {
  user: UserState | null;
  onShare: () => void;
  config: Config | null;
};

const ShareCTA = ({ user, onShare, config }: ShareCTAProps) => {
  const hasActive = user?.hasActiveThought ?? false;
  const rateLimit = config?.rateLimit ?? 'one';
  const isRateLimited = rateLimit === 'one' && hasActive;

  return (
    <div className="flex-shrink-0 w-full snap-start flex flex-col items-center justify-center gap-4 px-8 text-center py-10">
      {isRateLimited ? (
        <>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            You already have an active thought in this community.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Delete your current thought to post a new one.
          </p>
        </>
      ) : (
        <>
          <div className="text-4xl">✍️</div>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
            Add your thought
          </p>
          <button
            onClick={onShare}
            className="bg-orange-500 text-white font-semibold px-6 py-3 rounded-2xl text-sm hover:bg-orange-600 transition-colors shadow-md"
          >
            Share a thought
          </button>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ThoughtCard — full expanded card in carousel
// ---------------------------------------------------------------------------

type ThoughtCardProps = {
  thought: Thought;
  user: UserState | null;
  onReact: (thoughtId: string, emoji: string) => void;
  onOptions: (thought: Thought) => void;
  onClose: () => void;
};

const ThoughtCard = ({ thought, user, onReact, onOptions, onClose }: ThoughtCardProps) => {
  const ttl = hoursLeft(thought.expiresAt);
  const isOwner = user?.userId === thought.authorId;

  return (
    <div className="flex-shrink-0 w-full snap-start flex flex-col min-h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 text-xl">
          ✕
        </button>
        <button
          onClick={() => onOptions(thought)}
          className="text-gray-400 hover:text-gray-600 p-1 text-xl"
          aria-label="Options"
        >
          ⋯
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-4 gap-5">
        <div className="flex items-center gap-3">
          <Avatar username={thought.authorName} size={44} />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              u/{thought.authorName}
            </p>
            {isOwner && (
              <span className="text-xs text-orange-500 font-medium">Your thought</span>
            )}
          </div>
        </div>

        <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed font-medium">
          {thought.text}
        </p>

        <p className="text-xs text-gray-400 dark:text-gray-500">{ttl}</p>

        <ReactionRow thought={thought} onReact={onReact} compact={false} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

type ToastState = { message: string; id: number };

export const App = () => {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carousel state
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Hidden thoughts (session-only)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  // UI overlays
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [optionsThought, setOptionsThought] = useState<Thought | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // commentId
  const [toast, setToast] = useState<ToastState | null>(null);

  // Post locked state (set to true when the pinned post is locked by a mod)
  const [postLocked] = useState(false);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3000);
  }, []);

  // Load data
  useEffect(() => {
    apiFetch<InitResponse>('/api/init')
      .then((data) => {
        setThoughts(data.thoughts);
        setConfig(data.config);
        setUser(data.user);
        // Mark as seen
        fetch('/api/user/seen', { method: 'POST' }).catch(() => {});
      })
      .catch((err) => {
        setError(err.message ?? 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleThoughts = thoughts.filter((t) => !hiddenIds.has(t.id));

  // Scroll carousel to a specific card
  const scrollToCard = useCallback((index: number) => {
    const container = carouselRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setActiveIndex(index);
  }, []);

  const openCarousel = useCallback((index: number) => {
    setCarouselOpen(true);
    setActiveIndex(index);
    requestAnimationFrame(() => scrollToCard(index));
  }, [scrollToCard]);

  const closeCarousel = useCallback(() => {
    setCarouselOpen(false);
  }, []);

  // Handle carousel scroll (update activeIndex from scroll position)
  const handleCarouselScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container) return;
    const cardWidth = container.offsetWidth;
    const newIndex = Math.round(container.scrollLeft / cardWidth);
    setActiveIndex(newIndex);
  }, []);

  // Submit thought
  const handleSubmit = useCallback(async (text: string) => {
    if (postLocked) {
      showToast('This post is temporarily paused');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<SubmitThoughtResponse>('/api/thoughts', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setThoughts((prev) => [res.thought, ...prev]);
      setUser((u) => u ? { ...u, hasActiveThought: true, activeThoughtId: res.thought.id } : u);
      setSubmitOpen(false);
      showToast('Thought shared! ✓');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  }, [postLocked, showToast]);

  // React
  const handleReact = useCallback(async (thoughtId: string, emoji: string) => {
    // Optimistic update
    setThoughts((prev) =>
      prev.map((t) => {
        if (t.id !== thoughtId) return t;
        const existing = t.reactions.find((r) => r.emoji === emoji);
        let reactions;
        if (existing) {
          reactions = t.reactions
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.userVoted ? r.count - 1 : r.count + 1, userVoted: !r.userVoted }
                : r,
            )
            .filter((r) => r.count > 0);
        } else {
          reactions = [...t.reactions, { emoji, count: 1, userVoted: true }];
        }
        return { ...t, reactions };
      }),
    );

    try {
      const res = await apiFetch<ReactResponse>(`/api/thoughts/${thoughtId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      // Sync with server truth
      setThoughts((prev) =>
        prev.map((t) => {
          if (t.id !== thoughtId) return t;
          const reactions = t.reactions
            .map((r) => (r.emoji === emoji ? { ...r, count: res.count, userVoted: res.userVoted } : r))
            .filter((r) => r.count > 0);
          // If emoji didn't exist and server confirmed it, add it
          if (!t.reactions.find((r) => r.emoji === emoji) && res.count > 0) {
            reactions.push({ emoji, count: res.count, userVoted: res.userVoted });
          }
          return { ...t, reactions };
        }),
      );
    } catch {
      // Revert optimistic update by re-fetching — silent fail
    }
  }, []);

  // Delete
  const handleDelete = useCallback(async (commentId: string) => {
    try {
      await apiFetch<DeleteThoughtResponse>(`/api/thoughts/${commentId}`, { method: 'DELETE' });
      setThoughts((prev) => prev.filter((t) => t.id !== commentId));
      setUser((u) => u ? { ...u, hasActiveThought: false, activeThoughtId: null } : u);
      if (carouselOpen) closeCarousel();
      showToast('Thought deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete');
    }
    setDeleteConfirm(null);
  }, [carouselOpen, closeCarousel, showToast]);

  // Hide
  const handleHide = useCallback((thoughtId: string) => {
    setHiddenIds((prev) => new Set([...prev, thoughtId]));
  }, []);

  // Report
  const handleReport = useCallback((thought: Thought) => {
    navigateTo(`https://www.reddit.com/report?thing=${thought.id}&reason=other`);
  }, []);

  // Build carousel items: [starterPrompt?, ...thoughts, shareCTA]
  type CarouselItem =
    | { type: 'starter'; prompt: string }
    | { type: 'thought'; thought: Thought }
    | { type: 'cta' };

  const carouselItems: CarouselItem[] = [];
  if (config?.starterPrompt) {
    carouselItems.push({ type: 'starter', prompt: config.starterPrompt });
  }
  for (const t of visibleThoughts) {
    carouselItems.push({ type: 'thought', thought: t });
  }
  carouselItems.push({ type: 'cta' });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center bg-white dark:bg-gray-900">
        <p className="text-4xl">⚠️</p>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <h1 className="text-base font-bold text-gray-900 dark:text-white">
          {config?.postTitle ?? 'Community Thoughts'}
        </h1>
        {!postLocked && (
          <button
            onClick={() => setSubmitOpen(true)}
            className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-orange-600 transition-colors"
          >
            + Share a thought
          </button>
        )}
        {postLocked && (
          <span className="text-xs text-gray-400 italic">Post temporarily paused</span>
        )}
      </header>

      {/* Thought tray (horizontal scroll, 3 visible) */}
      {visibleThoughts.length === 0 && !config?.starterPrompt ? (
        <EmptyState onShare={() => setSubmitOpen(true)} />
      ) : (
        <section className="flex-1 flex flex-col">
          {/* Starter prompt banner (if set and no open carousel) */}
          {config?.starterPrompt && !carouselOpen && (
            <div className="mx-4 mb-2">
              <StarterPromptCard prompt={config.starterPrompt} />
            </div>
          )}

          {/* Thought bubble tray */}
          {visibleThoughts.length > 0 && !carouselOpen && (
            <div
              className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              {visibleThoughts.slice(0, 20).map((thought, idx) => (
                <button
                  key={thought.id}
                  onClick={() => openCarousel(config?.starterPrompt ? idx + 1 : idx)}
                  className="flex-shrink-0 w-56 snap-start bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-left border border-gray-100 dark:border-gray-700 hover:border-orange-300 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar username={thought.authorName} size={28} />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                      u/{thought.authorName}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3 mb-2">
                    {thought.text}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {thought.reactions.slice(0, 3).map((r) => (
                        <span key={r.emoji} className="text-sm">{r.emoji}</span>
                      ))}
                      {thought.reactions.length > 0 && (
                        <span className="text-xs text-gray-400 ml-1">
                          {thought.reactions.reduce((s, r) => s + r.count, 0)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{hoursLeft(thought.expiresAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* "View all" label */}
          {visibleThoughts.length > 0 && !carouselOpen && (
            <button
              onClick={() => openCarousel(0)}
              className="mx-auto text-xs text-orange-500 font-medium mt-1 mb-4 hover:underline"
            >
              View all {visibleThoughts.length} thought{visibleThoughts.length !== 1 ? 's' : ''}
            </button>
          )}
        </section>
      )}

      {/* Full carousel overlay */}
      {carouselOpen && (
        <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 flex flex-col">
          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 pt-3 pb-1">
          {carouselItems.map((_, dotIdx) => (
            <button
              key={dotIdx}
              onClick={() => scrollToCard(dotIdx)}
                className={`rounded-full transition-all ${
                  dotIdx === activeIndex
                    ? 'w-5 h-1.5 bg-orange-500'
                    : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Scrollable cards */}
          <div
            ref={carouselRef}
            className="flex-1 flex overflow-x-auto snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
            onScroll={handleCarouselScroll}
          >
            {carouselItems.map((item, _cardIdx) => {
              if (item.type === 'starter') {
                return (
                  <div key="starter" className="flex-shrink-0 w-full snap-start flex flex-col justify-center">
                    <StarterPromptCard prompt={item.prompt} />
                    <button
                      onClick={closeCarousel}
                      className="absolute top-4 right-4 text-gray-400 text-xl"
                    >
                      ✕
                    </button>
                  </div>
                );
              }
              if (item.type === 'thought') {
                return (
                  <ThoughtCard
                    key={item.thought.id}
                    thought={item.thought}
                    user={user}
                    onReact={handleReact}
                    onOptions={setOptionsThought}
                    onClose={closeCarousel}
                  />
                );
              }
              // CTA card
              return (
                <div key="cta" className="flex-shrink-0 w-full snap-start flex flex-col">
                  <div className="flex justify-end px-4 pt-4">
                    <button onClick={closeCarousel} className="text-gray-400 text-xl">✕</button>
                  </div>
                  <ShareCTA
                    user={user}
                    config={config}
                    onShare={() => {
                      closeCarousel();
                      setSubmitOpen(true);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit sheet */}
      {submitOpen && (
        <SubmitSheet
          onSubmit={handleSubmit}
          onClose={() => setSubmitOpen(false)}
          submitting={submitting}
        />
      )}

      {/* Options menu */}
      {optionsThought && (
        <OptionsMenu
          thought={optionsThought}
          currentUserId={user?.userId ?? ''}
          onClose={() => setOptionsThought(null)}
          onHide={handleHide}
          onDelete={(id) => {
            setOptionsThought(null);
            setDeleteConfirm(id);
          }}
          onReport={handleReport}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <DeleteConfirm
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-fade-in-up">
          {toast.message}
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
