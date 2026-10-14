import { Hono } from 'hono';
import { context, redis, reddit, settings } from '@devvit/web/server';
import type { T1 } from '@devvit/web/shared';
import {
  MAX_REACTION_EMOJIS,
  MAX_THOUGHT_LENGTH,
  isReactionEmoji,
  type Config,
  type DeleteThoughtResponse,
  type ErrorResponse,
  type InitResponse,
  type ReactRequest,
  type ReactResponse,
  type SubmitThoughtRequest,
  type SubmitThoughtResponse,
  type Thought,
  type UserSeenResponse,
} from '../../shared/api';
import { applyThoughtsPostStyles, ensureCurrentPostPinned } from '../core/post';

export const api = new Hono();

// ---------------------------------------------------------------------------
// Redis key helpers
// ---------------------------------------------------------------------------

const keys = {
  thoughts: (subId: string) => `thoughts:${subId}`,
  // Hash: commentId → '1' for removed entries
  removed: (subId: string) => `removed:${subId}`,
  // Hash: emoji → count
  reactions: (commentId: string) => `reactions:${commentId}`,
  // Hash: emoji → '1' for user voted
  voted: (userId: string, commentId: string) => `voted:${userId}:${commentId}`,
  activeThought: (userId: string, subId: string) => `activeThought:${userId}:${subId}`,
  // Hash: lastSeenAt → epoch ms string
  userPrefs: (userId: string, subId: string) => `userPrefs:${userId}:${subId}`,
  starterPromptOverride: (subId: string) => `starterPromptOverride:${subId}`,
};

const TTL_HOURS = 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getConfig(): Promise<Config> {
  const subredditId = context.subredditId ?? '';

  const [minKarmaRaw, starterPromptSetting, postTitleSetting, rateLimitRaw] = await Promise.all([
    settings.get<number>('minKarma').catch(() => undefined),
    settings.get<string>('starterPrompt').catch(() => undefined),
    settings.get<string>('postTitle').catch(() => undefined),
    settings.get<string>('rateLimit').catch(() => undefined),
  ]);

  // KV override for starter prompt takes precedence over Install Settings
  let starterPrompt = starterPromptSetting ?? '';
  try {
    const override = await redis.get(keys.starterPromptOverride(subredditId));
    if (override !== undefined && override !== null) starterPrompt = override;
  } catch {
    // no override
  }

  return {
    minKarma: typeof minKarmaRaw === 'number' ? minKarmaRaw : 0,
    starterPrompt: (starterPrompt ?? '').slice(0, 200),
    postTitle: (postTitleSetting ?? 'Community Thoughts').slice(0, 100),
    rateLimit: rateLimitRaw === 'none' ? 'none' : 'one',
  };
}

async function buildThoughtObjects(
  scoreMembers: { member: string; score: number }[],
  userId: string,
): Promise<Thought[]> {
  if (scoreMembers.length === 0) return [];

  const commentIds = scoreMembers.map((x) => x.member);

  // Fetch all comment objects and reactions in parallel
  const [comments, ...reactionMaps] = await Promise.all([
    Promise.all(
      commentIds.map((id) =>
        reddit.getCommentById(id as T1).catch(() => null),
      ),
    ),
    ...commentIds.map((id) =>
      redis.hGetAll(keys.reactions(id)).catch(() => ({} as Record<string, string>)),
    ),
  ]);

  // Fetch user vote hashes in parallel (hash: emoji → '1')
  const voteHashes = await Promise.all(
    commentIds.map((id) =>
      redis.hGetAll(keys.voted(userId, id)).catch(() => ({} as Record<string, string>)),
    ),
  );

  const thoughts: Thought[] = [];
  for (let i = 0; i < commentIds.length; i++) {
    const comment = comments[i];
    if (!comment) continue;

    const rawReactions: Record<string, string> = (reactionMaps[i] as Record<string, string>) ?? {};
    const userVotedMap: Record<string, string> = voteHashes[i] ?? {};

    const reactions = Object.entries(rawReactions)
      .map(([emoji, countStr]) => ({
        emoji,
        count: parseInt(countStr, 10) || 0,
        userVoted: userVotedMap[emoji] === '1',
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

    thoughts.push({
      id: comment.id,
      authorId: comment.authorId ?? '',
      authorName: comment.authorName ?? '[deleted]',
      text: comment.body ?? '',
      createdAt: comment.createdAt ? new Date(comment.createdAt).getTime() : Date.now(),
      expiresAt: scoreMembers[i]?.score ?? 0, // score = expiresAt epoch ms
      reactions,
    });
  }

  return thoughts;
}

// ---------------------------------------------------------------------------
// GET /api/init
// ---------------------------------------------------------------------------

api.get('/init', async (c) => {
  const subredditId = context.subredditId;
  const postId = context.postId;

  if (!subredditId || !postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Missing subredditId or postId in context' },
      400,
    );
  }

  try {
    applyThoughtsPostStyles(postId).catch(() => {});
    ensureCurrentPostPinned(postId).catch((error) => {
      console.error('Failed to pin Thoughts post:', error);
    });

    const currentUser = await reddit.getCurrentUser();
    const userId = currentUser?.id ?? '';
    const username = currentUser?.username ?? '';
    const karma = (currentUser?.linkKarma ?? 0) + (currentUser?.commentKarma ?? 0);

    const now = Date.now();

    // Load active thought IDs from TTL sorted set (score = expiryEpoch)
    // zRange with by:'score' returns {member, score}[] sorted ascending by score
    const activeMembers = await redis.zRange(
      keys.thoughts(subredditId),
      now,
      '+inf',
      { by: 'score' },
    );

    // Filter out removed IDs using the removed hash
    let filteredMembers = activeMembers;
    if (activeMembers.length > 0) {
      const removedHash = await redis.hGetAll(keys.removed(subredditId)).catch(() => ({} as Record<string, string>));
      filteredMembers = activeMembers.filter((m) => !removedHash[m.member]);
    }

    // Sort newest-first: highest expiresAt = most recently submitted
    const sortedMembers = [...filteredMembers].sort((a, b) => b.score - a.score);

    const thoughts = await buildThoughtObjects(sortedMembers, userId);

    // User prefs
    const prefs = await redis.hGetAll(keys.userPrefs(userId, subredditId)).catch(() => ({} as Record<string, string>));
    const lastSeenAt = parseInt(prefs['lastSeenAt'] ?? '0', 10) || 0;

    // Has active thought?
    const activeThoughtId = await redis
      .get(keys.activeThought(userId, subredditId))
      .catch(() => undefined);
    const hasActiveThought =
      !!activeThoughtId && filteredMembers.some((m) => m.member === activeThoughtId);
    if (activeThoughtId && !hasActiveThought) {
      await redis.del(keys.activeThought(userId, subredditId)).catch(() => {});
    }

    // New-badge
    const hasNewThoughts =
      lastSeenAt === 0
        ? false
        : thoughts.some((t) => t.createdAt > lastSeenAt);

    const config = await getConfig();

    return c.json<InitResponse>({
      type: 'init',
      postId,
      subredditName: context.subredditName ?? '',
      thoughts,
      config,
      user: {
        username: username ?? 'anonymous',
        userId,
        hasActiveThought,
        activeThoughtId: hasActiveThought ? (activeThoughtId ?? null) : null,
        lastSeenAt,
        karma,
      },
      hasNewThoughts,
    });
  } catch (error) {
    console.error('GET /api/init error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/thoughts — submit a new thought
// ---------------------------------------------------------------------------

api.post('/thoughts', async (c) => {
  const subredditId = context.subredditId;
  const postId = context.postId;

  if (!subredditId || !postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Missing context' }, 400);
  }

  try {
    const { text } = await c.req.json<SubmitThoughtRequest>();

    if (!text || text.trim().length === 0) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Thought text is required' }, 400);
    }
    if (text.length > MAX_THOUGHT_LENGTH) {
      return c.json<ErrorResponse>(
        { status: 'error', message: `Thought must be ${MAX_THOUGHT_LENGTH} characters or fewer` },
        400,
      );
    }

    const config = await getConfig();

    const currentUser = await reddit.getCurrentUser();
    if (!currentUser) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401);
    }
    const userId = currentUser.id;
    const username = currentUser.username;
    const karma = (currentUser.linkKarma ?? 0) + (currentUser.commentKarma ?? 0);

    // Karma gate
    if (karma < config.minKarma) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: `You need at least ${config.minKarma} karma to post a thought in this community`,
        },
        403,
      );
    }

    // Rate limit: one active thought per user
    if (config.rateLimit === 'one') {
      const existingId = await redis.get(keys.activeThought(userId, subredditId)).catch(() => undefined);
      if (existingId) {
        const score = await redis.zScore(keys.thoughts(subredditId), existingId).catch(() => undefined);
        const isStillActive = score !== undefined && score > Date.now();
        if (isStillActive) {
          return c.json<ErrorResponse>(
            {
              status: 'error',
              message: 'You already have an active thought. Delete it before posting a new one.',
            },
            409,
          );
        }
        await redis.del(keys.activeThought(userId, subredditId)).catch(() => {});
      }
    }

    // Submit comment as the current user
    const comment = await reddit.submitComment({
      id: postId as T1,
      text: text.trim(),
      runAs: 'USER',
    });

    const now = Date.now();
    const expiresAt = now + TTL_HOURS * 60 * 60 * 1000;

    // Store in Redis TTL sorted set (score = expiryEpoch)
    await redis.zAdd(keys.thoughts(subredditId), { score: expiresAt, member: comment.id });

    // Track active thought for rate limiting
    if (config.rateLimit === 'one') {
      await redis.set(keys.activeThought(userId, subredditId), comment.id);
    }

    const thought: Thought = {
      id: comment.id,
      authorId: userId,
      authorName: username,
      text: text.trim(),
      createdAt: now,
      expiresAt,
      reactions: [],
    };

    return c.json<SubmitThoughtResponse>({ type: 'submitThought', thought }, 201);
  } catch (error) {
    console.error('POST /api/thoughts error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: error instanceof Error ? error.message : 'Failed to submit thought' },
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/thoughts/:id — delete own thought
// ---------------------------------------------------------------------------

api.delete('/thoughts/:id', async (c) => {
  const commentId = c.req.param('id');
  const subredditId = context.subredditId;

  if (!subredditId || !commentId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Missing commentId or subredditId' }, 400);
  }

  try {
    const currentUser = await reddit.getCurrentUser();
    if (!currentUser) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401);
    }
    const userId = currentUser.id;

    // Verify ownership via comment
    const comment = await reddit.getCommentById(commentId as T1).catch(() => null);
    if (!comment) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Thought not found' }, 404);
    }
    if (comment.authorId !== userId) {
      return c.json<ErrorResponse>({ status: 'error', message: 'You can only delete your own thoughts' }, 403);
    }

    // Remove from Reddit as APP (app has mod-level access on install; ownership verified above)
    await reddit.remove(commentId as T1, false);

    // Clean up Redis
    await Promise.all([
      redis.zRem(keys.thoughts(subredditId), [commentId]).catch(() => {}),
      redis.del(keys.reactions(commentId)).catch(() => {}),
      redis.del(keys.activeThought(userId, subredditId)).catch(() => {}),
    ]);

    return c.json<DeleteThoughtResponse>({ type: 'deleteThought', commentId });
  } catch (error) {
    console.error(`DELETE /api/thoughts/${commentId} error:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: error instanceof Error ? error.message : 'Failed to delete thought' },
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/thoughts/:id/react — toggle emoji reaction
// ---------------------------------------------------------------------------

api.post('/thoughts/:id/react', async (c) => {
  const commentId = c.req.param('id');
  const subredditId = context.subredditId;

  if (!subredditId || !commentId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Missing commentId or subredditId' }, 400);
  }

  try {
    const { emoji: rawEmoji } = await c.req.json<ReactRequest>();
    const emoji = rawEmoji?.trim() ?? '';
    if (!isReactionEmoji(emoji)) {
      return c.json<ErrorResponse>({ status: 'error', message: 'A valid emoji is required' }, 400);
    }

    const currentUser = await reddit.getCurrentUser();
    if (!currentUser) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401);
    }
    const userId = currentUser.id;

    const voteKey = keys.voted(userId, commentId);
    const reactKey = keys.reactions(commentId);

    // Check if user already voted this emoji (hash: emoji → '1')
    const existingVote = await redis.hGet(voteKey, emoji).catch(() => undefined);
    const alreadyVoted = existingVote === '1';

    let newCount: number;
    let userVoted: boolean;

    if (alreadyVoted) {
      // Remove vote
      await redis.hDel(voteKey, [emoji]);
      const raw = await redis.hIncrBy(reactKey, emoji, -1);
      newCount = Math.max(0, raw);
      if (newCount === 0) {
        await redis.hDel(reactKey, [emoji]).catch(() => {});
      }
      userVoted = false;
    } else {
      const currentReactions = await redis.hGetAll(reactKey).catch(() => ({} as Record<string, string>));
      const uniqueEmojis = Object.entries(currentReactions)
        .filter(([, countStr]) => (parseInt(countStr, 10) || 0) > 0)
        .map(([key]) => key);
      const isNewEmoji = !uniqueEmojis.includes(emoji);
      if (isNewEmoji && uniqueEmojis.length >= MAX_REACTION_EMOJIS) {
        return c.json<ErrorResponse>(
          { status: 'error', message: `A thought can have at most ${MAX_REACTION_EMOJIS} reactions` },
          400,
        );
      }

      await redis.hSet(voteKey, { [emoji]: '1' });
      newCount = await redis.hIncrBy(reactKey, emoji, 1);
      userVoted = true;
    }

    return c.json<ReactResponse>({
      type: 'react',
      commentId,
      emoji,
      count: newCount,
      userVoted,
    });
  } catch (error) {
    console.error(`POST /api/thoughts/${commentId}/react error:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: error instanceof Error ? error.message : 'Failed to react' },
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/user/seen — update lastSeenAt for "New" badge
// ---------------------------------------------------------------------------

api.post('/user/seen', async (c) => {
  const subredditId = context.subredditId;

  try {
    const currentUser = await reddit.getCurrentUser();
    const userId = currentUser?.id ?? '';

    if (subredditId && userId) {
      await redis.hSet(keys.userPrefs(userId, subredditId), {
        lastSeenAt: String(Date.now()),
      });
    }

    return c.json<UserSeenResponse>({ type: 'userSeen' });
  } catch (error) {
    console.error('POST /api/user/seen error:', error);
    return c.json<UserSeenResponse>({ type: 'userSeen' });
  }
});
