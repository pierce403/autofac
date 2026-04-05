import { createInitialState } from './sim';
import type { GameState } from './types';

const STORAGE_KEY = 'autofac-save-v3';

export const loadState = (): GameState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }

    const parsed = JSON.parse(raw) as GameState;

    if (parsed.version !== 3) {
      return createInitialState();
    }

    return parsed;
  } catch {
    return createInitialState();
  }
};

export const saveState = (state: GameState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resetState = (): GameState => {
  const next = createInitialState();
  saveState(next);
  return next;
};
