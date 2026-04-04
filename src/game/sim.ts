import { PRODUCTS } from './content';
import type {
  GameState,
  HoldingState,
  LogEntry,
  MarketState,
  ProductDefinition,
  SimulationResult,
} from './types';

const START_DATE = '2026-03-15';
const MAX_LOGS = 14;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const parseDate = (value: string): Date => new Date(`${value}T12:00:00`);

const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

const withLog = (state: GameState, text: string, tone: LogEntry['tone']): GameState => ({
  ...state,
  logs: [{ day: state.day, text, tone }, ...state.logs].slice(0, MAX_LOGS),
});

const monthDistance = (peakMonth: number, currentMonth: number): number => {
  const diff = Math.abs(peakMonth - currentMonth);
  return Math.min(diff, 12 - diff);
};

export const getSeasonFactor = (product: ProductDefinition, dateString: string): number => {
  const currentMonth = parseDate(dateString).getMonth() + 1;
  const distance = monthDistance(product.peakMonth, currentMonth);

  return clamp(1.32 - distance * 0.085, 0.78, 1.32);
};

const describeSeason = (product: ProductDefinition, dateString: string): string => {
  const currentMonth = parseDate(dateString).getMonth() + 1;
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

const createHoldings = (): Record<string, HoldingState> =>
  Object.fromEntries(
    PRODUCTS.map((product) => [
      product.id,
      {
        quantity: 0,
        averageCost: 0,
      },
    ]),
  );

const createMarkets = (): Record<string, MarketState> =>
  Object.fromEntries(
    PRODUCTS.map((product) => [
      product.id,
      {
        productId: product.id,
        price: product.basePrice,
        supply: product.baseSupply,
        demandIndex: product.baseDemand,
        seasonFactor: getSeasonFactor(product, START_DATE),
        demandLabel: describeDemand(product.baseDemand),
        seasonLabel: describeSeason(product, START_DATE),
        note: 'Opening stock looks orderly.',
      },
    ]),
  );

export const createInitialState = (): GameState => ({
  version: 1,
  day: 1,
  currentDate: START_DATE,
  cash: 25000,
  realizedProfit: 0,
  warehouseCapacity: 24,
  holdings: createHoldings(),
  markets: createMarkets(),
  logs: [
    {
      day: 1,
      text: 'Opening bell. Inventory is available, but spring demand is already shifting.',
      tone: 'note',
    },
  ],
});

export const getProduct = (productId: string): ProductDefinition => {
  const product = PRODUCTS.find((entry) => entry.id === productId);

  if (!product) {
    throw new Error(`Unknown product: ${productId}`);
  }

  return product;
};

export const getUsedCapacity = (state: GameState): number =>
  PRODUCTS.reduce((total, product) => {
    const holding = state.holdings[product.id];
    return total + holding.quantity * product.storagePerUnit;
  }, 0);

export const getInventoryValue = (state: GameState): number =>
  roundMoney(
    PRODUCTS.reduce((total, product) => {
      const holding = state.holdings[product.id];
      const market = state.markets[product.id];
      return total + holding.quantity * market.price;
    }, 0),
  );

const updateHoldingAfterBuy = (
  holding: HoldingState,
  quantity: number,
  unitPrice: number,
): HoldingState => {
  const nextQuantity = holding.quantity + quantity;
  const nextAverage =
    nextQuantity === 0
      ? 0
      : roundMoney(
          (holding.averageCost * holding.quantity + unitPrice * quantity) / nextQuantity,
        );

  return {
    quantity: nextQuantity,
    averageCost: nextAverage,
  };
};

const updateHoldingAfterSell = (holding: HoldingState, quantity: number): HoldingState => {
  const nextQuantity = holding.quantity - quantity;

  return {
    quantity: nextQuantity,
    averageCost: nextQuantity === 0 ? 0 : holding.averageCost,
  };
};

const copyState = (state: GameState): GameState => ({
  ...state,
  holdings: Object.fromEntries(
    Object.entries(state.holdings).map(([productId, holding]) => [productId, { ...holding }]),
  ),
  markets: Object.fromEntries(
    Object.entries(state.markets).map(([productId, market]) => [productId, { ...market }]),
  ),
  logs: [...state.logs],
});

export const buyUnits = (
  state: GameState,
  productId: string,
  quantity: number,
): SimulationResult => {
  const product = getProduct(productId);
  const market = state.markets[productId];
  const holding = state.holdings[productId];
  const openCapacity = state.warehouseCapacity - getUsedCapacity(state);
  const maxByCapacity = Math.floor(openCapacity / product.storagePerUnit);
  const affordableQuantity = Math.floor(state.cash / market.price);
  const executableQuantity = Math.min(quantity, market.supply, maxByCapacity, affordableQuantity);

  if (executableQuantity <= 0) {
    return {
      ok: false,
      message: 'The lot will not clear. Check cash, supply, or warehouse space.',
      state,
    };
  }

  const next = copyState(state);
  const spend = roundMoney(executableQuantity * market.price);
  next.cash = roundMoney(next.cash - spend);
  next.holdings[productId] = updateHoldingAfterBuy(holding, executableQuantity, market.price);
  next.markets[productId].supply -= executableQuantity;
  next.markets[productId].price = roundMoney(
    market.price * (1 + executableQuantity / Math.max(product.baseSupply * 12, 1)),
  );

  return {
    ok: true,
    message: `Bought ${executableQuantity} ${product.name} for ${formatMoney(spend)}.`,
    state: withLog(next, `Bought ${executableQuantity} ${product.name}.`, 'trade'),
  };
};

export const sellUnits = (
  state: GameState,
  productId: string,
  quantity: number,
): SimulationResult => {
  const product = getProduct(productId);
  const market = state.markets[productId];
  const holding = state.holdings[productId];
  const executableQuantity = Math.min(quantity, holding.quantity);

  if (executableQuantity <= 0) {
    return {
      ok: false,
      message: 'No inventory to unload for this lot.',
      state,
    };
  }

  const next = copyState(state);
  const proceeds = roundMoney(executableQuantity * market.price);
  const realized = roundMoney((market.price - holding.averageCost) * executableQuantity);
  next.cash = roundMoney(next.cash + proceeds);
  next.realizedProfit = roundMoney(next.realizedProfit + realized);
  next.holdings[productId] = updateHoldingAfterSell(holding, executableQuantity);
  next.markets[productId].supply += executableQuantity;
  next.markets[productId].price = roundMoney(
    market.price * (1 - executableQuantity / Math.max(product.baseSupply * 18, 1)),
  );

  return {
    ok: true,
    message: `Sold ${executableQuantity} ${product.name} for ${formatMoney(proceeds)}.`,
    state: withLog(next, `Sold ${executableQuantity} ${product.name}.`, 'trade'),
  };
};

const buildMarketNote = (
  product: ProductDefinition,
  demandIndex: number,
  seasonFactor: number,
  supply: number,
): string => {
  if (seasonFactor >= 1.2 && demandIndex >= 1.12) {
    return `${product.category} buyers are front-loading orders.`;
  }

  if (supply <= Math.round(product.baseSupply * 0.45)) {
    return 'Warehouse stock is tightening.';
  }

  if (demandIndex <= 0.88) {
    return 'Buyers are waiting for cheaper lots.';
  }

  return 'Traffic looks orderly for now.';
};

export const advanceDay = (state: GameState): SimulationResult => {
  const next = copyState(state);
  const nextDate = parseDate(state.currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  next.day += 1;
  next.currentDate = toDateString(nextDate);

  const summaries: string[] = [];

  for (const product of PRODUCTS) {
    const market = next.markets[product.id];
    const seasonFactor = getSeasonFactor(product, next.currentDate);
    const pulse = randomBetween(1 - product.volatility, 1 + product.volatility);
    const demandIndex = clamp(product.baseDemand * seasonFactor * pulse, 0.68, 1.8);
    const buyerPull = Math.round(product.baseSupply * 0.065 * demandIndex + randomBetween(0, 4));
    const restock = Math.round(product.baseSupply * 0.05 + randomBetween(0, 5));
    const supply = clamp(market.supply + restock - buyerPull, 0, product.baseSupply * 2);
    const scarcity = clamp((product.baseSupply - supply) / product.baseSupply, -0.35, 0.9);
    const drift = randomBetween(-product.volatility / 4, product.volatility / 4);
    const priceDelta =
      (demandIndex - 1) * product.priceElasticity + scarcity * 0.11 + drift;
    const price = roundMoney(
      clamp(market.price * (1 + priceDelta), product.basePrice * 0.68, product.basePrice * 1.9),
    );

    next.markets[product.id] = {
      ...market,
      price,
      supply,
      demandIndex: roundMoney(demandIndex),
      seasonFactor: roundMoney(seasonFactor),
      demandLabel: describeDemand(demandIndex),
      seasonLabel: describeSeason(product, next.currentDate),
      note: buildMarketNote(product, demandIndex, seasonFactor, supply),
    };

    if (demandIndex >= 1.22 || scarcity >= 0.35) {
      summaries.push(`${product.name} is heating up.`);
    }
  }

  const summary =
    summaries[0] ??
    'Demand rotated quietly today. No single product took over the board.';

  return {
    ok: true,
    message: summary,
    state: withLog(next, summary, 'note'),
  };
};

export const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
