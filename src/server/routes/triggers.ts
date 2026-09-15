import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';

export const triggers = new Hono();

// ---------------------------------------------------------------------------
// Redis key helpers (duplicated here to avoid circular imports)
// ---------------------------------------------------------------------------

// Hash: commentId → '1' for removed entries
const removedKey = (subredditId: string) => `removed:${subredditId}`;
const thoughtsKey = (subredditId: string) => `thoughts:${subredditId}`;

// ---------------------------------------------------------------------------
// onAppInstall — create the pinned post and store its ID
// ---------------------------------------------------------------------------

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Community Thoughts post created in r/${context.subredditName} (postId: ${post.id})`,
      },
      200,
    );
  } catch (error) {
    console.error('onAppInstall error:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to create pinned post' },
      400,
    );
  }
});

// ---------------------------------------------------------------------------
// onCommentDelete — mark comment as removed in carousel index.
// Guards against non-thought comments by checking the sorted set first.
// ---------------------------------------------------------------------------

triggers.post('/on-comment-delete', async (c) => {
  try {
    const body = await c.req.json<{ commentId?: string; subredditId?: string }>();
    const commentId = body.commentId;
    const subredditId = context.subredditId;

    if (!commentId || !subredditId) {
      return c.json<TriggerResponse>({ status: 'success', message: 'No-op: missing ids' }, 200);
    }

    // Only act if this comment is in our thoughts index
    const score = await redis.zScore(thoughtsKey(subredditId), commentId).catch(() => undefined);
    if (score === undefined) {
      return c.json<TriggerResponse>({ status: 'success', message: 'Not a thought — skipped' }, 200);
    }

    // Mark removed using a hash (commentId → '1')
    await redis.hSet(removedKey(subredditId), { [commentId]: '1' });
    console.log(`Thought ${commentId} marked removed in r/${context.subredditName}`);

    return c.json<TriggerResponse>({ status: 'success', message: `Marked ${commentId} as removed` }, 200);
  } catch (error) {
    console.error('onCommentDelete trigger error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Trigger handler failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// onModAction — sync carousel when a mod removes or re-approves a thought.
// ---------------------------------------------------------------------------

triggers.post('/on-mod-action', async (c) => {
  try {
    const body = await c.req.json<{
      action?: string;
      targetId?: string;
      subredditId?: string;
    }>();

    const action = body.action;
    const commentId = body.targetId;
    const subredditId = context.subredditId;

    if (!commentId || !subredditId) {
      return c.json<TriggerResponse>({ status: 'success', message: 'No-op: missing ids' }, 200);
    }

    // Only act if this is a thought in our index
    const score = await redis.zScore(thoughtsKey(subredditId), commentId).catch(() => undefined);
    if (score === undefined) {
      return c.json<TriggerResponse>({ status: 'success', message: 'Not a thought — skipped' }, 200);
    }

    if (action === 'removecomment') {
      await redis.hSet(removedKey(subredditId), { [commentId]: '1' });
      console.log(`Mod removed thought ${commentId} in r/${context.subredditName}`);
    } else if (action === 'approvecomment') {
      await redis.hDel(removedKey(subredditId), [commentId]);
      console.log(`Mod re-approved thought ${commentId} in r/${context.subredditName}`);
    }

    return c.json<TriggerResponse>({ status: 'success', message: `Handled mod action: ${action}` }, 200);
  } catch (error) {
    console.error('onModAction trigger error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Trigger handler failed' }, 500);
  }
});
