import { PRODUCTS, RIVALS } from './content';
import type {
  GameState,
  HoldingState,
  LogEntry,
  MarketState,
  PricePoint,
  ProductDefinition,
  RivalState,
  RivalStyle,
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
        listingPrice: null,
      },
    ]),
  );

const createRivals = (): RivalState[] =>
  RIVALS.map((rival) => ({
    id: rival.id,
    name: rival.name,
    style: rival.style,
    cash: rival.startingCash,
    holdings: createHoldings(),
    description: rival.description,
    lastAction: 'Watching the opening board.',
  }));

const createMarkets = (): Record<string, MarketState> =>
  Object.fromEntries(
    PRODUCTS.map((product) => [
      product.id,
      {
        productId: product.id,
        price: product.basePrice,
        priceHistory: [{ day: 1, price: product.basePrice }],
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
  version: 4,
  day: 1,
  currentDate: START_DATE,
  cash: 1000,
  realizedProfit: 0,
  warehouseCapacity: 24,
  holdings: createHoldings(),
  markets: createMarkets(),
  rivals: createRivals(),
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
    listingPrice: holding.listingPrice,
  };
};

const updateHoldingAfterSell = (holding: HoldingState, quantity: number): HoldingState => {
  const nextQuantity = holding.quantity - quantity;

  return {
    quantity: nextQuantity,
    averageCost: nextQuantity === 0 ? 0 : holding.averageCost,
    listingPrice: nextQuantity === 0 ? null : holding.listingPrice,
  };
};

const appendPriceHistory = (history: PricePoint[], day: number, nextPrice: number): PricePoint[] => {
  const normalizedPrice = roundMoney(nextPrice);
  const prevPrice = history.at(-1);

  if (prevPrice && prevPrice.day === day && prevPrice.price === normalizedPrice) {
    return history;
  }

  return [...history, { day, price: normalizedPrice }];
};

const copyState = (state: GameState): GameState => ({
  ...state,
  holdings: Object.fromEntries(
    Object.entries(state.holdings).map(([productId, holding]) => [productId, { ...holding }]),
  ),
  markets: Object.fromEntries(
    Object.entries(state.markets).map(([productId, market]) => [productId, { ...market }]),
  ),
  rivals: state.rivals.map((rival) => ({
    ...rival,
    holdings: Object.fromEntries(
      Object.entries(rival.holdings).map(([productId, holding]) => [productId, { ...holding }]),
    ),
  })),
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
  next.markets[productId].priceHistory = appendPriceHistory(
    market.priceHistory,
    state.day,
    next.markets[productId].price,
  );
  next.holdings[productId].listingPrice = roundMoney(market.price * 1.1);

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
  next.markets[productId].priceHistory = appendPriceHistory(
    market.priceHistory,
    state.day,
    next.markets[productId].price,
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

const getRivalExposure = (rival: RivalState): number =>
  PRODUCTS.reduce((total, product) => total + rival.holdings[product.id].quantity, 0);

const styleLabel = (style: RivalStyle): string => {
  if (style === 'seasonal') {
    return 'seasonal desk';
  }

  if (style === 'scalper') {
    return 'scalper desk';
  }

  return 'value desk';
};

const rivalSellTarget = (style: RivalStyle): number => {
  if (style === 'scalper') {
    return 0.08;
  }

  if (style === 'seasonal') {
    return 0.11;
  }

  return 0.14;
};

const scoreBuyTarget = (
  style: RivalStyle,
  product: ProductDefinition,
  market: MarketState,
): number => {
  const premium = (market.price - product.basePrice) / product.basePrice;
  const scarcity = clamp((product.baseSupply - market.supply) / product.baseSupply, -0.4, 0.8);
  const stability = 1 - Math.abs(market.demandIndex - 1);

  if (style === 'seasonal') {
    return market.seasonFactor * 0.9 + (market.demandIndex - 1) * 0.65 - premium * 0.55;
  }

  if (style === 'scalper') {
    return scarcity * 1.2 + (market.demandIndex - 1) * 0.85 - premium * 0.3;
  }

  return (product.basePrice - market.price) / product.basePrice + stability * 0.45 - scarcity * 0.15;
};

const sellFromRival = (
  state: GameState,
  rival: RivalState,
  product: ProductDefinition,
  quantity: number,
): string | null => {
  const market = state.markets[product.id];
  const holding = rival.holdings[product.id];
  const executableQuantity = Math.min(quantity, holding.quantity);

  if (executableQuantity <= 0) {
    return null;
  }

  const proceeds = roundMoney(executableQuantity * market.price);
  rival.cash = roundMoney(rival.cash + proceeds);
  rival.holdings[product.id] = updateHoldingAfterSell(holding, executableQuantity);
  state.markets[product.id].supply += executableQuantity;
  state.markets[product.id].price = roundMoney(
    market.price * (1 - executableQuantity / Math.max(product.baseSupply * 26, 1)),
  );
  state.markets[product.id].priceHistory = appendPriceHistory(
    market.priceHistory,
    state.day,
    state.markets[product.id].price,
  );

  return `${rival.name} unloaded ${executableQuantity} ${product.name}.`;
};

const buyForRival = (
  state: GameState,
  rival: RivalState,
  product: ProductDefinition,
  quantity: number,
): string | null => {
  const market = state.markets[product.id];
  const affordableQuantity = Math.floor(rival.cash / market.price);
  const executableQuantity = Math.min(quantity, market.supply, affordableQuantity);

  if (executableQuantity <= 0) {
    return null;
  }

  const spend = roundMoney(executableQuantity * market.price);
  rival.cash = roundMoney(rival.cash - spend);
  rival.holdings[product.id] = updateHoldingAfterBuy(
    rival.holdings[product.id],
    executableQuantity,
    market.price,
  );
  state.markets[product.id].supply -= executableQuantity;
  state.markets[product.id].price = roundMoney(
    market.price * (1 + executableQuantity / Math.max(product.baseSupply * 14, 1)),
  );
  state.markets[product.id].priceHistory = appendPriceHistory(
    market.priceHistory,
    state.day,
    state.markets[product.id].price,
  );

  return `${rival.name} accumulated ${executableQuantity} ${product.name}.`;
};

const simulateRivalAction = (state: GameState, rival: RivalState): string | null => {
  const sellCandidate = PRODUCTS.map((product) => {
    const market = state.markets[product.id];
    const holding = rival.holdings[product.id];

    if (holding.quantity <= 0) {
      return null;
    }

    const margin = (market.price - holding.averageCost) / Math.max(holding.averageCost, 1);
    const offSeasonPenalty = market.seasonFactor < 0.92 ? 0.08 : 0;
    const score = margin + offSeasonPenalty;

    return {
      product,
      holding,
      score,
      margin,
    };
  })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => right.score - left.score)[0];

  if (sellCandidate && sellCandidate.margin >= rivalSellTarget(rival.style)) {
    const quantity = clamp(
      Math.ceil(sellCandidate.holding.quantity * (rival.style === 'scalper' ? 0.7 : 0.45)),
      1,
      6,
    );
    return sellFromRival(state, rival, sellCandidate.product, quantity);
  }

  const buyCandidate = PRODUCTS.map((product) => ({
    product,
    score: scoreBuyTarget(rival.style, product, state.markets[product.id]),
  }))
    .sort((left, right) => right.score - left.score)[0];

  if (!buyCandidate || buyCandidate.score < 0.92) {
    rival.lastAction = `${rival.name} stayed patient.`;
    return null;
  }

  const desiredQuantity =
    rival.style === 'scalper'
      ? Math.round(randomBetween(3, 7))
      : rival.style === 'seasonal'
        ? Math.round(randomBetween(2, 6))
        : Math.round(randomBetween(2, 5));

  return buyForRival(state, rival, buyCandidate.product, desiredQuantity);
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
      priceHistory: appendPriceHistory(market.priceHistory, next.day, price),
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

  const rivalNotes = next.rivals
    .map((rival) => {
      const note = simulateRivalAction(next, rival);
      rival.lastAction = note ?? `${rival.name} stayed patient as a ${styleLabel(rival.style)}.`;
      return note;
    })
    .filter((note): note is string => Boolean(note));

  let resultState = withLog(next, summary, 'note');

  for (const note of rivalNotes) {
    resultState = withLog(resultState, note, 'rival');
  }

  return {
    ok: true,
    message:
      rivalNotes[0] ?? summary,
    state: resultState,
  };
};

export const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

export const setListingPrice = (
  state: GameState,
  productId: string,
  listingPrice: number | null,
): SimulationResult => {
  const product = getProduct(productId);
  const holding = state.holdings[productId];

  if (holding.quantity <= 0) {
    return {
      ok: false,
      message: `No ${product.name} holdings to list.`,
      state,
    };
  }

  if (listingPrice !== null && listingPrice <= 0) {
    return {
      ok: false,
      message: 'Listing price must be above zero.',
      state,
    };
  }

  const next = copyState(state);
  const normalized = listingPrice === null ? null : roundMoney(listingPrice);
  next.holdings[productId].listingPrice = normalized;

  return {
    ok: true,
    message:
      normalized === null
        ? `Cleared auto-listing for ${product.name}.`
        : `Set ${product.name} listing to ${formatMoney(normalized)}.`,
    state: withLog(
      next,
      normalized === null
        ? `Cleared listing for ${product.name}.`
        : `Updated ${product.name} listing to ${formatMoney(normalized)}.`,
      'trade',
    ),
  };
};

export const runAutoListings = (state: GameState): SimulationResult => {
  const next = copyState(state);
  const sales: string[] = [];

  for (const product of PRODUCTS) {
    const holding = next.holdings[product.id];
    const market = next.markets[product.id];

    if (holding.quantity <= 0 || holding.listingPrice === null || market.price < holding.listingPrice) {
      continue;
    }

    const proceeds = roundMoney(holding.quantity * market.price);
    const realized = roundMoney((market.price - holding.averageCost) * holding.quantity);
    const quantity = holding.quantity;

    next.cash = roundMoney(next.cash + proceeds);
    next.realizedProfit = roundMoney(next.realizedProfit + realized);
    next.holdings[product.id] = {
      quantity: 0,
      averageCost: 0,
      listingPrice: null,
    };
    next.markets[product.id].supply += quantity;
    next.markets[product.id].price = roundMoney(
      market.price * (1 - quantity / Math.max(product.baseSupply * 18, 1)),
    );
    next.markets[product.id].priceHistory = appendPriceHistory(
      market.priceHistory,
      next.day,
      next.markets[product.id].price,
    );
    sales.push(`Auto-sold ${quantity} ${product.name} at ${formatMoney(market.price)}.`);
  }

  if (sales.length === 0) {
    return {
      ok: false,
      message: 'No listings filled this update.',
      state,
    };
  }

  let result = next;
  for (const sale of sales) {
    result = withLog(result, sale, 'trade');
  }

  return {
    ok: true,
    message: sales.join(' '),
    state: result,
  };
};
