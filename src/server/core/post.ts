import { reddit, redis, settings, context } from '@devvit/web/server';

const DEFAULT_TITLE = 'Community Thoughts';
const PINNED_POST_KEY = (subredditId: string) => `pinnedPost:${subredditId}`;

/**
 * Creates the Community Thoughts custom post, stores its ID in Redis,
 * and returns the post object.
 */
export const createPost = async () => {
  const subredditId = context.subredditId;

  // Read title from Install Settings, fall back to default
  let title = DEFAULT_TITLE;
  try {
    const configuredTitle = await settings.get<string>('postTitle');
    if (configuredTitle && configuredTitle.trim().length > 0) {
      title = configuredTitle.trim().slice(0, 100);
    }
  } catch {
    // settings may not be available during first install; use default
  }

  const post = await reddit.submitCustomPost({ title });

  // Persist the post ID so the API can reference it later
  if (subredditId) {
    await redis.set(PINNED_POST_KEY(subredditId), post.id);
  }

  return post;
};

/**
 * Returns the stored pinned post ID for the current subreddit, or null.
 */
export const getPinnedPostId = async (): Promise<string | null> => {
  const subredditId = context.subredditId;
  if (!subredditId) return null;
  const result = await redis.get(PINNED_POST_KEY(subredditId));
  return result ?? null;
};
