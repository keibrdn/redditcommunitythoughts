import type { KeyboardEvent } from 'react';
import { posterHandle, type Thought, type UserState } from '../../shared/api';

const AVATAR_COLORS = ['#3f8efc', '#0079d3', '#46d160', '#ff4500', '#7b68ee', '#ffb000'];

export function hoursLeftLabel(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return '0h left';
  const hours = Math.max(1, Math.ceil(diff / 3_600_000));
  return `${hours}h left`;
}

export function avatarColor(name: string): string {
  const code = name?.charCodeAt(0) ?? 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length] ?? '#0079d3';
}

export function avatarLetter(name: string): string {
  return (name?.[0] ?? '?').toUpperCase();
}

export function thoughtHandle(thought: Thought, user: UserState | null): string {
  const isOwn =
    user !== null && (thought.authorId === user.userId || thought.id === user.activeThoughtId);
  if (isOwn && user.username.trim().length > 0) return posterHandle(user.username);
  return posterHandle(thought.authorName);
}

export function totalReactions(thought: Thought): number {
  return thought.reactions.reduce((sum, reaction) => sum + reaction.count, 0);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  const data = (await res.json()) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Request failed');
  }
  return data as T;
}

export function activateOnKey(event: KeyboardEvent, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}
