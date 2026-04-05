import { createInitialState } from './sim';
import type { GameState, PricePoint } from './types';

const STORAGE_KEY = 'autofac-save-v4';
const LEGACY_STORAGE_KEYS = ['autofac-save-v3'] as const;

interface LegacyMarketStateV3 {
  productId: string;
  price: number;
  priceHistory: number[];
  supply: number;
  demandIndex: number;
  seasonFactor: number;
  demandLabel: string;
  seasonLabel: string;
  note: string;
}

interface LegacyGameStateV3 extends Omit<GameState, 'version' | 'markets'> {
  version: 3;
  markets: Record<string, LegacyMarketStateV3>;
}

const migratePriceHistory = (
  history: number[],
  currentDay: number,
  currentPrice: number,
): PricePoint[] => {
  const normalized = history.length > 0 ? history : [currentPrice];
  const startDay = Math.max(1, currentDay - normalized.length + 1);
  const points = normalized.map((price, index) => ({
    day: startDay + index,
    price,
  }));

  const lastPoint = points.at(-1);
  if (!lastPoint || lastPoint.price !== currentPrice || lastPoint.day !== currentDay) {
    points.push({ day: currentDay, price: currentPrice });
  }

  return points;
};

const migrateV3State = (state: LegacyGameStateV3): GameState => ({
  ...state,
  version: 4,
  markets: Object.fromEntries(
    Object.entries(state.markets).map(([productId, market]) => [
      productId,
      {
        ...market,
        priceHistory: migratePriceHistory(market.priceHistory, state.day, market.price),
      },
    ]),
  ),
});

export const loadState = (): GameState => {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as GameState | LegacyGameStateV3;

      if (parsed.version === 4) {
        return parsed as GameState;
      }

      if (parsed.version === 3) {
        const migrated = migrateV3State(parsed as LegacyGameStateV3);
        saveState(migrated);

        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          window.localStorage.removeItem(legacyKey);
        }

        return migrated;
      }
    } catch {
      continue;
    }
  }

  return createInitialState();
};

export const saveState = (state: GameState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resetState = (): GameState => {
  const next = createInitialState();
  saveState(next);
  return next;
};
