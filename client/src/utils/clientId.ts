import { generateId } from './id';

const STORAGE_KEY = 'soulLockClientId';

export const getClientId = (): string => {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const next = generateId();
  window.localStorage.setItem(STORAGE_KEY, next);
  return next;
};
