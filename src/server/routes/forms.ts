import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';

export const forms = new Hono();

const starterPromptOverrideKey = (subId: string) => `starterPromptOverride:${subId}`;

// ---------------------------------------------------------------------------
// Update starter prompt — called when a mod submits the "Update Prompt" form
// ---------------------------------------------------------------------------

forms.post('/update-prompt-submit', async (c) => {
  const subredditId = context.subredditId;

  type FormValues = { prompt?: string };
  const { prompt } = await c.req.json<FormValues>();

  const trimmed = typeof prompt === 'string' ? prompt.trim().slice(0, 200) : '';

  try {
    if (subredditId) {
      if (trimmed.length > 0) {
        await redis.set(starterPromptOverrideKey(subredditId), trimmed);
      } else {
        // Empty string → remove override (and hide the prompt card)
        await redis.del(starterPromptOverrideKey(subredditId));
      }
    }

    return c.json<UiResponse>(
      {
        showToast: trimmed.length > 0 ? 'Starter prompt updated ✓' : 'Starter prompt removed ✓',
      },
      200,
    );
  } catch (error) {
    console.error('update-prompt-submit error:', error);
    return c.json<UiResponse>({ showToast: 'Failed to update prompt' }, 500);
  }
});
