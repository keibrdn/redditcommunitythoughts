import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import type { Form } from '@devvit/shared-types/shared/form.js';
import { context, redis } from '@devvit/web/server';
import { createPost, ensurePinnedPost } from '../core/post';

export const menu = new Hono();

// ---------------------------------------------------------------------------
// Redis key helpers
// ---------------------------------------------------------------------------

const thoughtsKey = (subId: string) => `thoughts:${subId}`;

// ---------------------------------------------------------------------------
// POST /internal/menu/post-create (initial create) +
// POST /internal/menu/thoughts-reset-post (mod reset)
// ---------------------------------------------------------------------------

menu.post('/post-create', async (c) => {
  try {
    const post = await ensurePinnedPost();
    const subredditName = context.subredditName;
    return c.json<UiResponse>(
      {
        showToast: `Community Thoughts is pinned to the top of r/${subredditName ?? 'your subreddit'}.`,
        navigateTo: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
      },
      200,
    );
  } catch (error) {
    console.error('Error creating Thoughts post:', error);
    return c.json<UiResponse>({ showToast: 'Failed to create post — check server logs' }, 400);
  }
});

menu.post('/thoughts-reset-post', async (c) => {
  try {
    const post = await createPost();
    const subredditName = context.subredditName;
    return c.json<UiResponse>(
      {
        showToast: `Thoughts post recreated and pinned in r/${subredditName ?? ''}`,
        navigateTo: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
      },
      200,
    );
  } catch (error) {
    console.error('Error resetting Thoughts post:', error);
    return c.json<UiResponse>({ showToast: 'Failed to reset post — check server logs' }, 400);
  }
});

// ---------------------------------------------------------------------------
// POST /internal/menu/thoughts-update-prompt
// Opens a Devvit form to update the starter prompt inline.
// ---------------------------------------------------------------------------

const updatePromptForm: Form = {
  title: 'Update starter prompt',
  description: 'This prompt appears as a pinned card at the top of the Thoughts carousel. Leave blank to hide it.',
  fields: [
    {
      type: 'paragraph',
      name: 'prompt',
      label: 'Starter prompt',
      placeholder: "What's on your mind about…",
    },
  ],
  acceptLabel: 'Save',
  cancelLabel: 'Cancel',
};

menu.post('/thoughts-update-prompt', async (c) => {
  return c.json<UiResponse>(
    {
      showForm: {
        name: 'updatePromptForm',
        form: updatePromptForm,
      },
    },
    200,
  );
});

// ---------------------------------------------------------------------------
// POST /internal/menu/thoughts-clear-expired
// Manually removes all expired entries from the thoughts sorted set.
// ---------------------------------------------------------------------------

menu.post('/thoughts-clear-expired', async (c) => {
  const subredditId = context.subredditId;

  if (!subredditId) {
    return c.json<UiResponse>({ showToast: 'No subreddit context' }, 400);
  }

  try {
    const now = Date.now();
    await redis.zRemRangeByScore(thoughtsKey(subredditId), 0, now - 1);
    return c.json<UiResponse>({ showToast: 'Expired thoughts cleared from index ✓' }, 200);
  } catch (error) {
    console.error('thoughts-clear-expired error:', error);
    return c.json<UiResponse>({ showToast: 'Failed to clear expired thoughts' }, 500);
  }
});
