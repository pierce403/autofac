import { PRODUCTS } from './content';
import { createInitialState, getSeasonFactor } from './sim';
import type { GameState, PricePoint } from './types';

const STORAGE_KEY = 'autofac-save-v7';
const LEGACY_STORAGE_KEYS = [
  'autofac-save-v6',
  'autofac-save-v5',
  'autofac-save-v4',
  'autofac-save-v3',
] as const;

const LEGACY_V6_BASELINES = {
  'solshade-lotion': { basePrice: 18, baseSupply: 58 },
  'draftpod-fan': { basePrice: 34, baseSupply: 42 },
  'brightnest-tabs': { basePrice: 14, baseSupply: 64 },
  'quickpatch-roll': { basePrice: 22, baseSupply: 38 },
  'hearthleaf-sachets': { basePrice: 12, baseSupply: 72 },
  'pawprint-bites': { basePrice: 16, baseSupply: 76 },
} as const;

const CURRENT_PRODUCTS = Object.fromEntries(PRODUCTS.map((product) => [product.id, product]));

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const monthDistance = (peakMonth: number, currentMonth: number): number => {
  const diff = Math.abs(peakMonth - currentMonth);
  return Math.min(diff, 12 - diff);
};

const describeDemand = (value: number): string => {
  if (value >= 1.28) {
    return 'Hot';
  }

  if (value >= 1.08) {
    return 'Firm';
  }

  if (value <= 0.84) {
    return 'Soft';
  }

  return 'Balanced';
};

const describeSeason = (productId: string, dateString: string): string => {
  const product = CURRENT_PRODUCTS[productId];
  const currentMonth = new Date(`${dateString}T12:00:00`).getMonth() + 1;
  const distance = monthDistance(product.peakMonth, currentMonth);

  if (distance === 0) {
    return 'Peak season';
  }

  if (distance <= 1) {
    return 'Season building';
  }

  if (distance >= 5) {
    return 'Out of season';
  }

  return 'Steady demand';
};

const normalizePrice = (
  price: number,
  legacyBasePrice: number,
  currentBasePrice: number,
): number =>
  clamp(
    roundMoney((price / Math.max(legacyBasePrice, 1)) * currentBasePrice),
    currentBasePrice * 0.58,
    currentBasePrice * 2.4,
  );

const normalizePriceHistory = (
  history: PricePoint[],
  legacyBasePrice: number,
  currentBasePrice: number,
): PricePoint[] =>
  history.map((point) => ({
    ...point,
    price: normalizePrice(point.price, legacyBasePrice, currentBasePrice),
  }));

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

interface LegacyGameStateV6 extends GameState {
  version: 6;
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

const migrateV3State = (state: LegacyGameStateV3): GameState =>
  migrateV6State({
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
  } as LegacyGameStateV6);

const migrateV4State = (state: LegacyGameStateV4): GameState =>
  migrateV6State({
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
  } as LegacyGameStateV6);

const migrateV5State = (state: LegacyGameStateV5): GameState =>
  migrateV6State({
    ...state,
    version: 6,
    newsFeed: [],
  } as LegacyGameStateV6);

const migrateV6State = (state: LegacyGameStateV6): GameState => ({
  ...state,
  version: 7,
  holdings: Object.fromEntries(
    Object.entries(state.holdings).map(([productId, holding]) => {
      const legacy = LEGACY_V6_BASELINES[productId as keyof typeof LEGACY_V6_BASELINES];
      const current = CURRENT_PRODUCTS[productId];

      if (!legacy || !current || holding.quantity <= 0) {
        return [
          productId,
          {
            quantity: 0,
            averageCost: 0,
            listingPrice: null,
          },
        ];
      }

      return [
        productId,
        {
          quantity: holding.quantity,
          averageCost: normalizePrice(holding.averageCost, legacy.basePrice, current.basePrice),
          listingPrice:
            holding.listingPrice === null
              ? null
              : normalizePrice(holding.listingPrice, legacy.basePrice, current.basePrice),
        },
      ];
    }),
  ),
  markets: Object.fromEntries(
    Object.entries(state.markets).map(([productId, market]) => {
      const legacy = LEGACY_V6_BASELINES[productId as keyof typeof LEGACY_V6_BASELINES];
      const current = CURRENT_PRODUCTS[productId];

      if (!legacy || !current) {
        return [productId, market];
      }

      const supplyRatio = market.supply / Math.max(legacy.baseSupply, 1);

      return [
        productId,
        {
          ...market,
          price: normalizePrice(market.price, legacy.basePrice, current.basePrice),
          priceHistory: normalizePriceHistory(
            market.priceHistory,
            legacy.basePrice,
            current.basePrice,
          ),
          supply: clamp(Math.round(supplyRatio * current.baseSupply), 0, current.baseSupply * 2),
          demandLabel: describeDemand(market.demandIndex),
          seasonFactor: roundMoney(getSeasonFactor(current, state.currentDate)),
          seasonLabel: describeSeason(productId, state.currentDate),
          note: 'Staple lanes are repricing after the catalog refresh.',
        },
      ];
    }),
  ),
  rivals: state.rivals.map((rival) => ({
    ...rival,
    holdings: Object.fromEntries(
      Object.entries(rival.holdings).map(([productId, holding]) => {
        const legacy = LEGACY_V6_BASELINES[productId as keyof typeof LEGACY_V6_BASELINES];
        const current = CURRENT_PRODUCTS[productId];

        if (!legacy || !current || holding.quantity <= 0) {
          return [
            productId,
            {
              quantity: 0,
              averageCost: 0,
              listingPrice: null,
            },
          ];
        }

        return [
          productId,
          {
            quantity: holding.quantity,
            averageCost: normalizePrice(holding.averageCost, legacy.basePrice, current.basePrice),
            listingPrice:
              holding.listingPrice === null
                ? null
                : normalizePrice(holding.listingPrice, legacy.basePrice, current.basePrice),
          },
        ];
      }),
    ),
    lastAction: `${rival.name} is repricing the refreshed staples board.`,
  })),
  newsFeed: [],
  logs: [
    {
      day: state.day,
      text: 'Board rotated into staple foods and repeat-purchase toiletries. Existing positions were translated onto the refreshed catalog.',
      tone: 'note',
    },
  ],
});

export const loadState = (): GameState => {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as
        | GameState
        | LegacyGameStateV3
        | LegacyGameStateV4
        | LegacyGameStateV5
        | LegacyGameStateV6;

      if (parsed.version === 7) {
        return parsed as GameState;
      }

      if (parsed.version === 6) {
        const migrated = migrateV6State(parsed as LegacyGameStateV6);
        saveState(migrated);

        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          window.localStorage.removeItem(legacyKey);
        }

        return migrated;
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
