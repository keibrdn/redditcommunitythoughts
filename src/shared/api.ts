// ---------------------------------------------------------------------------
// Shared types between client and server
// ---------------------------------------------------------------------------

// A single emoji reaction with count and whether the current user voted
export type Reaction = {
  emoji: string;
  count: number;
  userVoted: boolean;
};

// A thought (backed by a Reddit comment)
export type Thought = {
  id: string; // Reddit comment ID
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
  reactions: Reaction[];
};

// Subreddit-level config read from Install Settings (+ any Redis overrides)
export type Config = {
  minKarma: number;
  starterPrompt: string; // empty string means no prompt card
  postTitle: string;
  rateLimit: 'one' | 'none';
};

// User state bundled into the init response
export type UserState = {
  username: string;
  userId: string;
  hasActiveThought: boolean;
  activeThoughtId: string | null; // commentId of the user's current thought
  lastSeenAt: number; // epoch ms — used to compute "New" badge
  karma: number; // combined karma used for minKarma gate
};

// ---------------------------------------------------------------------------
// API request / response types
// ---------------------------------------------------------------------------

export type InitResponse = {
  type: 'init';
  postId: string;
  thoughts: Thought[];
  config: Config;
  user: UserState;
  hasNewThoughts: boolean; // true when thoughts exist newer than user.lastSeenAt
};

export type SubmitThoughtRequest = {
  text: string;
};

export type SubmitThoughtResponse = {
  type: 'submitThought';
  thought: Thought;
};

export type DeleteThoughtResponse = {
  type: 'deleteThought';
  commentId: string;
};

export type ReactRequest = {
  emoji: string;
  // toggle: add if not voted, remove if already voted
};

export type ReactResponse = {
  type: 'react';
  commentId: string;
  emoji: string;
  count: number;
  userVoted: boolean;
};

export type UserSeenResponse = {
  type: 'userSeen';
};

// ---------------------------------------------------------------------------
// Generic error envelope
// ---------------------------------------------------------------------------

export type ErrorResponse = {
  status: 'error';
  message: string;
};
