import { createInitialState } from './sim';
import type { GameState, PricePoint } from './types';

const STORAGE_KEY = 'autofac-save-v6';
const LEGACY_STORAGE_KEYS = ['autofac-save-v5', 'autofac-save-v4', 'autofac-save-v3'] as const;

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

interface LegacyGameStateV3 extends Omit<GameState, 'version' | 'markets' | 'newsFeed'> {
  version: 3;
  markets: Record<string, LegacyMarketStateV3>;
}

interface LegacyMarketStateV4 {
  productId: string;
  price: number;
  priceHistory: PricePoint[];
  supply: number;
  demandIndex: number;
  seasonFactor: number;
  demandLabel: string;
  seasonLabel: string;
  note: string;
}

interface LegacyGameStateV4 extends Omit<GameState, 'version' | 'markets' | 'newsFeed'> {
  version: 4;
  markets: Record<string, LegacyMarketStateV4>;
}

interface LegacyGameStateV5 extends Omit<GameState, 'version' | 'newsFeed'> {
  version: 5;
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
  version: 6,
  markets: Object.fromEntries(
    Object.entries(state.markets).map(([productId, market]) => [
      productId,
      {
        ...market,
        priceHistory: migratePriceHistory(market.priceHistory, state.day, market.price),
        demandShock: 0,
        supplyShock: 0,
      },
    ]),
  ),
  newsFeed: [],
});

const migrateV4State = (state: LegacyGameStateV4): GameState => ({
  ...state,
  version: 6,
  markets: Object.fromEntries(
    Object.entries(state.markets).map(([productId, market]) => [
      productId,
      {
        ...market,
        demandShock: 0,
        supplyShock: 0,
      },
    ]),
  ),
  newsFeed: [],
});

const migrateV5State = (state: LegacyGameStateV5): GameState => ({
  ...state,
  version: 6,
  newsFeed: [],
});

export const loadState = (): GameState => {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as GameState | LegacyGameStateV3 | LegacyGameStateV5;

      if (parsed.version === 6) {
        return parsed as GameState;
      }

      if (parsed.version === 5) {
        const migrated = migrateV5State(parsed as LegacyGameStateV5);
        saveState(migrated);

        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          window.localStorage.removeItem(legacyKey);
        }

        return migrated;
      }

      if (parsed.version === 4) {
        const migrated = migrateV4State(parsed as LegacyGameStateV4);
        saveState(migrated);

        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          window.localStorage.removeItem(legacyKey);
        }

        return migrated;
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
