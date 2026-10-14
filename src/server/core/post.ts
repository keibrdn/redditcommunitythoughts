import { reddit, redis, settings, context } from '@devvit/web/server';
import type { T3 } from '@devvit/web/shared';

const DEFAULT_TITLE = 'Community Thoughts';
const PINNED_POST_KEY = (subredditId: string) => `pinnedPost:${subredditId}`;
const POST_STYLE_KEY = (postId: string) => `postStyles:${postId}:v4`;

const THOUGHTS_POST_STYLES = {
  heightPixels: 512,
  backgroundColor: '#F6F7F8FF',
};

type StickyablePost = {
  id: string;
  stickied: boolean;
  removed: boolean;
  sticky: (position?: 1 | 2 | 3 | 4) => Promise<void>;
};

const isPostId = (id: string | null | undefined): id is T3 =>
  typeof id === 'string' && id.startsWith('t3_');

export const applyThoughtsPostStyles = async (postId: T3) => {
  const alreadyApplied = await redis.get(POST_STYLE_KEY(postId));
  if (alreadyApplied) return;
  await reddit.setPostStyles(postId, THOUGHTS_POST_STYLES);
  await redis.set(POST_STYLE_KEY(postId), '1');
};

const rememberPinnedPost = async (postId: string) => {
  const subredditId = context.subredditId;
  if (!subredditId) return;
  await redis.set(PINNED_POST_KEY(subredditId), postId);
};

const stickyPinnedPost = async (post: StickyablePost) => {
  if (post.removed) return;
  if (post.stickied) return;
  await post.sticky(1);
};

const loadStoredPost = async (): Promise<StickyablePost | null> => {
  const storedId = await getPinnedPostId();
  if (!isPostId(storedId)) return null;
  try {
    const post = await reddit.getPostById(storedId);
    if (post.removed) return null;
    return post;
  } catch {
    return null;
  }
};

/**
 * Creates the Community Thoughts custom post, stores its ID in Redis,
 * pins it to the top of the subreddit, and returns the post object.
 */
export const createPost = async () => {
  let title = DEFAULT_TITLE;
  try {
    const configuredTitle = await settings.get<string>('postTitle');
    if (configuredTitle && configuredTitle.trim().length > 0) {
      title = configuredTitle.trim().slice(0, 100);
    }
  } catch {
    // settings may not be available during first install; use default
  }

  const post = await reddit.submitCustomPost({
    title,
    styles: THOUGHTS_POST_STYLES,
  });

  await rememberPinnedPost(post.id);
  await stickyPinnedPost(post);
  return post;
};

/**
 * Reuses the stored Thoughts post when it still exists; otherwise creates one.
 * Always stickies it so it stays at the top of Best / Hot / etc.
 */
export const ensurePinnedPost = async () => {
  const existing = await loadStoredPost();
  if (existing) {
    await stickyPinnedPost(existing);
    return existing;
  }
  return createPost();
};

/**
 * Stickies the current custom post when it is the stored Thoughts post.
 * Used from /api/init so an already-created post can move to the top.
 */
export const ensureCurrentPostPinned = async (postId: string) => {
  if (!isPostId(postId)) return;
  const storedId = await getPinnedPostId();
  if (storedId && storedId !== postId) return;
  if (!storedId) {
    await rememberPinnedPost(postId);
  }
  const post = await reddit.getPostById(postId);
  await stickyPinnedPost(post);
};

/**
 * Returns the stored Thoughts post ID for the current subreddit, or null.
 */
export const getPinnedPostId = async (): Promise<string | null> => {
  const subredditId = context.subredditId;
  if (!subredditId) return null;
  const result = await redis.get(PINNED_POST_KEY(subredditId));
  return result ?? null;
};
