import { useCallback, useEffect, useMemo, useState } from 'react';
import { navigateTo } from '@devvit/web/client';
import {
  MAX_REACTION_EMOJIS,
  type DeleteThoughtResponse,
  type InitResponse,
  type ReactResponse,
  type SubmitThoughtResponse,
  type Thought,
  type UserState,
} from '../../shared/api';
import { ComposerModal } from './ComposerModal';
import { apiFetch } from './helpers';
import { OptionsSheet } from './OptionsSheet';
import { ThoughtsBand } from './ThoughtsBand';
import { ThoughtViewer } from './ThoughtViewer';
import { Toast } from './Toast';

const FIRST_POST_KEY = 'thoughts:hasPosted';

export const ThoughtsApp = () => {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [user, setUser] = useState<UserState | null>(null);
  const [subredditName, setSubredditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [menuThought, setMenuThought] = useState<Thought | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hasPosted, setHasPosted] = useState(() => {
    try {
      return sessionStorage.getItem(FIRST_POST_KEY) === '1';
    } catch {
      return false;
    }
  });

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 2600);
  }, []);

  useEffect(() => {
    apiFetch<InitResponse>('/api/init')
      .then((data) => {
        setThoughts(data.thoughts);
        setUser(data.user);
        setSubredditName(data.subredditName);
        fetch('/api/user/seen', { method: 'POST' }).catch(() => {});
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, []);

  const myThought = useMemo(() => {
    if (!user?.activeThoughtId) return null;
    return thoughts.find((thought) => thought.id === user.activeThoughtId) ?? null;
  }, [thoughts, user]);

  const others = useMemo(
    () =>
      thoughts.filter(
        (thought) => thought.id !== myThought?.id && !hiddenIds.has(thought.id),
      ),
    [thoughts, myThought, hiddenIds],
  );

  const viewerThoughts = useMemo(() => {
    const ordered: Thought[] = [];
    if (myThought) ordered.push(myThought);
    ordered.push(...others);
    return ordered;
  }, [myThought, others]);

  const openComposer = () => {
    if (myThought) {
      setViewerId(myThought.id);
      return;
    }
    setComposerOpen(true);
  };

  const handleSubmit = async (text: string) => {
    setSubmitting(true);
    try {
      const res = await apiFetch<SubmitThoughtResponse>('/api/thoughts', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setThoughts((prev) => [res.thought, ...prev.filter((thought) => thought.id !== res.thought.id)]);
      setUser((current) =>
        current
          ? { ...current, hasActiveThought: true, activeThoughtId: res.thought.id }
          : current,
      );
      setComposerOpen(false);
      setHasPosted(true);
      try {
        sessionStorage.setItem(FIRST_POST_KEY, '1');
      } catch {
        // ignore
      }
      showToast('Thought shared');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReact = async (thoughtId: string, emoji: string) => {
    let previous: Thought[] = [];
    setThoughts((prev) => {
      previous = prev;
      return prev.map((thought) => {
        if (thought.id !== thoughtId) return thought;
        const existing = thought.reactions.find((reaction) => reaction.emoji === emoji);
        if (!existing && thought.reactions.length >= MAX_REACTION_EMOJIS) {
          return thought;
        }
        const reactions = existing
          ? thought.reactions
              .map((reaction) =>
                reaction.emoji === emoji
                  ? {
                      ...reaction,
                      count: reaction.userVoted ? reaction.count - 1 : reaction.count + 1,
                      userVoted: !reaction.userVoted,
                    }
                  : reaction,
              )
              .filter((reaction) => reaction.count > 0)
          : [...thought.reactions, { emoji, count: 1, userVoted: true }];
        return { ...thought, reactions };
      });
    });

    try {
      const res = await apiFetch<ReactResponse>(`/api/thoughts/${thoughtId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      setThoughts((prev) =>
        prev.map((thought) => {
          if (thought.id !== thoughtId) return thought;
          const next = thought.reactions
            .map((reaction) =>
              reaction.emoji === emoji
                ? { ...reaction, count: res.count, userVoted: res.userVoted }
                : reaction,
            )
            .filter((reaction) => reaction.count > 0);
          if (!next.find((reaction) => reaction.emoji === emoji) && res.count > 0) {
            next.push({ emoji, count: res.count, userVoted: res.userVoted });
          }
          return { ...thought, reactions: next };
        }),
      );
    } catch (err) {
      setThoughts(previous);
      showToast(err instanceof Error ? err.message : 'Could not save reaction');
    }
  };

  const handleDelete = async (thought: Thought) => {
    try {
      await apiFetch<DeleteThoughtResponse>(`/api/thoughts/${thought.id}`, { method: 'DELETE' });
      setThoughts((prev) => prev.filter((item) => item.id !== thought.id));
      setUser((current) =>
        current ? { ...current, hasActiveThought: false, activeThoughtId: null } : current,
      );
      setMenuThought(null);
      setViewerId(null);
      showToast('Thought deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return <div className="app-error">{error}</div>;
  }

  return (
    <div className={`app-root${composerOpen ? ' composer-open' : ''}`}>
      <ThoughtsBand
        user={user}
        myThought={myThought}
        others={others}
        onAdd={openComposer}
        onOpenThought={(_event, thoughtId) => setViewerId(thoughtId)}
      />

      {viewerId && (
        <ThoughtViewer
          thoughts={viewerThoughts}
          startId={viewerId}
          user={user}
          onClose={() => setViewerId(null)}
          onMenu={setMenuThought}
          onReact={handleReact}
        />
      )}
      {composerOpen && (
        <ComposerModal
          submitting={submitting}
          subredditName={subredditName}
          showEducation={!hasPosted}
          onClose={() => setComposerOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
      <OptionsSheet
        thought={menuThought}
        isMine={menuThought?.authorId === user?.userId}
        onClose={() => setMenuThought(null)}
        onViewProfile={(thought) => {
          navigateTo(`https://reddit.com/user/${thought.authorName}`);
          setMenuThought(null);
        }}
        onHide={(thought) => {
          setHiddenIds((prev) => new Set([...prev, thought.id]));
          setMenuThought(null);
          if (viewerId === thought.id) setViewerId(null);
          showToast('Thought hidden');
        }}
        onReport={(thought) => {
          navigateTo(`https://www.reddit.com/report?thing=${thought.id}&reason=other`);
          setMenuThought(null);
        }}
        onDelete={handleDelete}
      />
      <Toast message={toast} />
    </div>
  );
};
