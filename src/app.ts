import { PRODUCTS } from './game/content';
import {
  advanceDay,
  buyUnits,
  formatMoney,
  getInventoryValue,
  getProduct,
  getUsedCapacity,
  runAutoListings,
  sellUnits,
  setListingPrice,
} from './game/sim';
import { loadState, resetState, saveState } from './game/storage';
import type { GameState, LogEntry, MarketState, NewsItem, PricePoint } from './game/types';

const AUTO_DAY_MS = 60_000;
const CHART_WINDOWS = [7, 30, 365, 'all'] as const;

type ChartWindow = (typeof CHART_WINDOWS)[number];

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`));

const formatCountdown = (secondsRemaining: number): string => {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatChartWindow = (value: ChartWindow): string =>
  value === 'all' ? 'All' : `${value}D`;

const isNewsActive = (item: NewsItem, currentDay: number): boolean => item.expiresDay >= currentDay;

const logToneClass = (tone: LogEntry['tone']): string => {
  if (tone === 'trade') {
    return 'trade';
  }

  if (tone === 'rival') {
    return 'rival';
  }

  if (tone === 'warning') {
    return 'warning';
  }

  return 'note';
};

const rivalStyleLabel = (value: string): string => value.replace(/^\w/, (match) => match.toUpperCase());
const formatPercent = (value: number): string => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
const getGainClass = (value: number): string =>
  value > 0 ? 'gain-positive' : value < 0 ? 'gain-negative' : 'gain-neutral';

const newsToneClass = (item: NewsItem, currentDay: number): string =>
  `${item.tone} ${isNewsActive(item, currentDay) ? 'active' : 'settled'}`;

const formatNewsScope = (item: NewsItem): string => {
  const productNames = [...new Set(item.effects.map((effect) => getProduct(effect.productId).name))];

  if (productNames.length >= PRODUCTS.length) {
    return 'Whole local board';
  }

  if (productNames.length <= 2) {
    return productNames.join(' + ');
  }

  return `${productNames[0]}, ${productNames[1]} +${productNames.length - 2}`;
};

const formatNewsImpact = (item: NewsItem): string => {
  const demandShift = item.effects.reduce((total, effect) => total + effect.demandShift, 0);
  const supplyShift = item.effects.reduce((total, effect) => total + effect.supplyShift, 0);

  if (Math.abs(demandShift) >= 0.12 && Math.abs(supplyShift) >= 0.12) {
    if (demandShift > 0 && supplyShift > 0) {
      return 'Demand up, stock tight';
    }

    if (demandShift > 0 && supplyShift < 0) {
      return 'Demand up, stock easing';
    }

    if (demandShift < 0 && supplyShift > 0) {
      return 'Demand cool, stock tight';
    }

    return 'Demand cool, stock loose';
  }

  if (Math.abs(demandShift) >= Math.abs(supplyShift)) {
    return demandShift >= 0 ? 'Demand lift' : 'Demand cooldown';
  }

  return supplyShift >= 0 ? 'Supply squeeze' : 'Supply relief';
};

const buildDailySeries = (
  history: PricePoint[],
  currentDay: number,
  chartWindow: ChartWindow,
): PricePoint[] => {
  const normalizedHistory = history.length > 0 ? history : [{ day: currentDay, price: 0 }];
  const startDay =
    chartWindow === 'all'
      ? Math.max(1, normalizedHistory[0]?.day ?? 1)
      : Math.max(1, currentDay - chartWindow + 1);

  const series: PricePoint[] = [];
  let historyIndex = 0;
  let activePrice = normalizedHistory[0]?.price ?? 0;

  for (let day = startDay; day <= currentDay; day += 1) {
    while (historyIndex < normalizedHistory.length && normalizedHistory[historyIndex].day <= day) {
      activePrice = normalizedHistory[historyIndex].price;
      historyIndex += 1;
    }

    series.push({ day, price: activePrice });
  }

  return series.length > 0 ? series : [{ day: currentDay, price: activePrice }];
};

const buildChartPath = (series: PricePoint[], width: number, height: number, padding: number) => {
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const prices = series.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceSpan = Math.max(maxPrice - minPrice, 1);

  const coordinates = series.map((point, index) => {
    const x =
      series.length === 1
        ? width / 2
        : padding + (index / (series.length - 1)) * chartWidth;
    const normalized = (point.price - minPrice) / priceSpan;
    const y = padding + (1 - normalized) * chartHeight;
    return { x, y };
  });

  const linePath = coordinates
    .map((coordinate, index) => `${index === 0 ? 'M' : 'L'} ${coordinate.x.toFixed(2)} ${coordinate.y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${coordinates.at(-1)?.x.toFixed(2) ?? width - padding} ${(height - padding).toFixed(2)} L ${coordinates[0]?.x.toFixed(2) ?? padding} ${(height - padding).toFixed(2)} Z`;

  return {
    areaPath,
    linePath,
    minPrice,
    maxPrice,
  };
};

const renderPriceChart = (
  market: MarketState,
  currentDay: number,
  chartWindow: ChartWindow,
): string => {
  const series = buildDailySeries(market.priceHistory, currentDay, chartWindow);
  const firstPrice = series[0]?.price ?? market.price;
  const lastPrice = series.at(-1)?.price ?? market.price;
  const changeRatio = firstPrice > 0 ? (lastPrice - firstPrice) / firstPrice : 0;
  const trendClass =
    changeRatio > 0.001 ? 'positive' : changeRatio < -0.001 ? 'negative' : 'neutral';
  const { areaPath, linePath, minPrice, maxPrice } = buildChartPath(series, 240, 96, 10);

  return `
    <section class="price-chart-card">
      <div class="price-chart-meta">
        <span class="price-chart-range">${formatChartWindow(chartWindow)} view</span>
        <span class="price-chart-change ${trendClass}">${formatPercent(changeRatio)}</span>
      </div>
      <svg class="price-chart" viewBox="0 0 240 96" preserveAspectRatio="none" aria-hidden="true">
        <path class="price-chart-area" d="${areaPath}"></path>
        <path class="price-chart-line ${trendClass}" d="${linePath}"></path>
      </svg>
      <div class="price-chart-footer">
        <span>Low ${formatMoney(minPrice)}</span>
        <span>High ${formatMoney(maxPrice)}</span>
      </div>
    </section>
  `;
};

const renderRivalCard = (state: GameState, rivalId: string): string => {
  const rival = state.rivals.find((entry) => entry.id === rivalId);

  if (!rival) {
    return '';
  }

  const exposure = Object.values(rival.holdings).reduce(
    (total, holding) => total + holding.quantity,
    0,
  );

  return `
    <article class="rival-card">
      <div class="product-topline">
        <div>
          <p class="card-kicker">Rival Desk</p>
          <h3>${rival.name}</h3>
        </div>
        <div class="spot-price">${formatMoney(rival.cash)}</div>
      </div>
      <div class="chip-row">
        <span class="chip neutral">${rivalStyleLabel(rival.style)}</span>
        <span class="chip neutral">${exposure} units open</span>
      </div>
      <p class="product-description">${rival.description}</p>
      <p class="market-note">${rival.lastAction}</p>
    </article>
  `;
};

const renderNewsCard = (state: GameState, item: NewsItem): string => {
  const active = isNewsActive(item, state.day);
  const daysRemaining = Math.max(0, item.expiresDay - state.day + 1);

  return `
    <li class="news-item ${newsToneClass(item, state.day)}">
      <div class="news-topline">
        <span class="card-kicker">Day ${item.startedDay} bulletin</span>
        <span class="news-status">${active ? `${daysRemaining}d left` : 'Settled'}</span>
      </div>
      <h3>${item.headline}</h3>
      <p class="news-copy">${item.summary}</p>
      <div class="chip-row">
        <span class="chip neutral">${formatNewsScope(item)}</span>
        <span class="chip neutral">${formatNewsImpact(item)}</span>
      </div>
    </li>
  `;
};

const renderProductCard = (
  state: GameState,
  productId: string,
  chartWindow: ChartWindow,
  isExpanded: boolean,
): string => {
  const product = getProduct(productId);
  const market = state.markets[productId];
  const holding = state.holdings[productId];
  const canBuy = state.cash >= market.price && market.supply > 0;
  const canSell = holding.quantity > 0;
  const holdingGain =
    holding.quantity > 0 ? (market.price - holding.averageCost) * holding.quantity : 0;
  const holdingReturn =
    holding.quantity > 0 && holding.averageCost > 0
      ? (market.price - holding.averageCost) / holding.averageCost
      : 0;
  const listingPrice = holding.listingPrice ?? market.price * 1.1;
  const gainClass = getGainClass(holdingGain);
  const holdingGainSummary =
    holding.quantity > 0
      ? `${formatMoney(holdingGain)} (${formatPercent(holdingReturn)})`
      : '$0';

  return `
    <article class="product-card asset-card ${isExpanded ? 'expanded' : 'collapsed'}">
      <button
        class="asset-toggle"
        data-action="toggle-asset"
        data-product-id="${product.id}"
        aria-expanded="${isExpanded ? 'true' : 'false'}"
      >
        <div class="asset-toggle-main">
          <p class="card-kicker">${product.category}</p>
          <h3>${product.name}</h3>
        </div>
        <dl class="asset-summary">
          <div>
            <dt>Price</dt>
            <dd>${formatMoney(market.price)}</dd>
          </div>
          <div>
            <dt>Held</dt>
            <dd>${holding.quantity}</dd>
          </div>
          <div>
            <dt>P/L</dt>
            <dd class="${gainClass}">${holdingGainSummary}</dd>
          </div>
        </dl>
        <span class="asset-toggle-icon" aria-hidden="true">${isExpanded ? '-' : '+'}</span>
      </button>
      ${
        !isExpanded
          ? ''
          : `
      <div class="asset-details">
        <div class="product-topline">
        <div>
          <p class="card-kicker">Spot Market</p>
          <h3>${product.name}</h3>
        </div>
        <div class="spot-price">${formatMoney(market.price)}</div>
      </div>

      <p class="product-description">${product.description}</p>

      <div class="chip-row">
        <span class="chip ${market.demandLabel.toLowerCase()}">${market.demandLabel}</span>
        <span class="chip neutral">${market.seasonLabel}</span>
      </div>

      <dl class="stat-grid">
        <div>
          <dt>Supply</dt>
          <dd>${market.supply} lots</dd>
        </div>
        <div>
          <dt>Demand</dt>
          <dd>${market.demandIndex.toFixed(2)}x</dd>
        </div>
        <div>
          <dt>Owned</dt>
          <dd>${holding.quantity}</dd>
        </div>
        <div>
          <dt>Avg Cost</dt>
          <dd>${holding.quantity > 0 ? formatMoney(holding.averageCost) : 'None'}</dd>
        </div>
        <div>
          <dt>Gain/Loss</dt>
          <dd class="${gainClass}">${holding.quantity > 0 ? holdingGainSummary : 'None'}</dd>
        </div>
        <div>
          <dt>Listing</dt>
          <dd>${holding.quantity > 0 ? formatMoney(listingPrice) : 'None'}</dd>
        </div>
      </dl>
      ${renderPriceChart(market, state.day, chartWindow)}

      <p class="market-note">${market.note}</p>

      <div class="button-row">
        <button data-action="buy" data-product-id="${product.id}" data-quantity="1" ${
          canBuy ? '' : 'disabled'
        }>Buy 1</button>
        <button data-action="buy" data-product-id="${product.id}" data-quantity="5" ${
          canBuy ? '' : 'disabled'
        }>Buy 5</button>
        <button data-action="sell" data-product-id="${product.id}" data-quantity="1" ${
          canSell ? '' : 'disabled'
        }>Sell 1</button>
        <button data-action="sell" data-product-id="${product.id}" data-quantity="5" ${
          canSell ? '' : 'disabled'
        }>Sell 5</button>
        <button data-action="listing-bump" data-product-id="${product.id}" data-direction="-1" ${
          canSell ? '' : 'disabled'
        }>Listing -5%</button>
        <button data-action="listing-bump" data-product-id="${product.id}" data-direction="1" ${
          canSell ? '' : 'disabled'
        }>Listing +5%</button>
      </div>
      </div>
      `
      }
    </article>
  `;
};

const render = (
  state: GameState,
  flash: string,
  secondsRemaining: number,
  chartWindow: ChartWindow,
  expandedProductIds: Set<string>,
): string => {
  const inventoryValue = getInventoryValue(state);
  const usedCapacity = getUsedCapacity(state);
  const netWorth = state.cash + inventoryValue;
  const countdownProgress = ((AUTO_DAY_MS - secondsRemaining * 1000) / AUTO_DAY_MS) * 100;
  const activeNewsCount = state.newsFeed.filter((item) => isNewsActive(item, state.day)).length;

  return `
    <main class="shell">
      <section class="hero">
        <div class="hero-header">
          <div>
            <p class="eyebrow">Warehouse Speculation Sim</p>
            <h1>Autofac</h1>
          </div>
          <div class="hero-date">
            <span>Day ${state.day}</span>
            <strong>${formatDate(state.currentDate)}</strong>
          </div>
        </div>
        <p class="lede">
          Buy fictional same-day goods before demand shifts. Sell into strength before your
          warehouse fills with dead weight.
        </p>
        <section class="hero-control-strip" aria-label="Market clock and controls">
          <div class="clock-donut-card">
            <div
              class="clock-donut"
              style="--clock-progress: ${countdownProgress.toFixed(2)}%;"
              aria-hidden="true"
            >
              <div class="clock-donut-inner"></div>
            </div>
            <div class="clock-stack">
              <span class="clock-label">Next Market Day</span>
              <strong class="clock-readout">${formatCountdown(secondsRemaining)}</strong>
              <span class="clock-note">1 live minute = 1 day</span>
            </div>
          </div>
          <div class="hero-actions compact">
            <button class="primary" data-action="advance-day">Advance Day</button>
            <button class="secondary" data-action="reset-run">Reset Run</button>
          </div>
        </section>
        <p class="flash">${flash}</p>
      </section>

      <section class="summary-grid">
        <article class="metric-card">
          <span class="metric-label">Cash</span>
          <strong>${formatMoney(state.cash)}</strong>
          <span class="metric-note">Liquid buying power</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Inventory</span>
          <strong>${formatMoney(inventoryValue)}</strong>
          <span class="metric-note">Marked to current spot prices</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Net Worth</span>
          <strong>${formatMoney(netWorth)}</strong>
          <span class="metric-note">Cash plus warehouse value</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">Slots Used</span>
          <strong>${usedCapacity}/${state.warehouseCapacity}</strong>
          <span class="metric-note">Storage is the first real constraint</span>
        </article>
      </section>

      <div class="dashboard-layout">
        <section class="panel market-panel">
          <div class="panel-header">
            <h2>Market Board</h2>
            <div class="panel-header-actions">
              <span class="pill">Single Player</span>
              <div class="asset-view-actions" role="group" aria-label="Asset expansion controls">
                <button
                  class="asset-view-button"
                  data-action="expand-all-assets"
                  ${expandedProductIds.size === PRODUCTS.length ? 'disabled' : ''}
                >
                  Expand All
                </button>
                <button
                  class="asset-view-button"
                  data-action="collapse-all-assets"
                  ${expandedProductIds.size === 0 ? 'disabled' : ''}
                >
                  Collapse All
                </button>
              </div>
              <div class="chart-window-switcher" role="group" aria-label="Price chart range">
                ${CHART_WINDOWS.map((windowValue) => {
                  const isActive = chartWindow === windowValue;
                  return `
                    <button
                      class="chart-window ${isActive ? 'active' : ''}"
                      data-action="chart-window"
                      data-window="${windowValue}"
                      aria-pressed="${isActive ? 'true' : 'false'}"
                    >
                      ${formatChartWindow(windowValue)}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
          <div class="product-grid market-list">
            ${PRODUCTS.map((product) =>
              renderProductCard(state, product.id, chartWindow, expandedProductIds.has(product.id)),
            ).join('')}
          </div>
        </section>

        <aside class="side-column">
          <section class="panel">
            <div class="panel-header">
              <h2>Rival Desks</h2>
              <span class="pill subtle">${state.rivals.length} active</span>
            </div>
            <div class="product-grid rival-grid">
              ${state.rivals.map((rival) => renderRivalCard(state, rival.id)).join('')}
            </div>
          </section>

          <section class="panel news-panel">
            <div class="panel-header">
              <h2>Local Wire</h2>
              <span class="pill subtle">${activeNewsCount > 0 ? `${activeNewsCount} active` : 'Quiet board'}</span>
            </div>
            ${
              state.newsFeed.length === 0
                ? `
                  <p class="news-empty">
                    No district bulletins yet. Prices are moving on seasonal flow, buyer urgency,
                    and rival trading.
                  </p>
                `
                : `
                  <ul class="news-list">
                    ${state.newsFeed.map((item) => renderNewsCard(state, item)).join('')}
                  </ul>
                `
            }
          </section>

          <section class="panel notes-panel">
            <div class="panel-header">
              <h2>Desk Notes</h2>
              <span class="pill subtle">Local Save Active</span>
            </div>
            <ul class="log-list">
              ${state.logs
                .map(
                  (entry) => `
                    <li class="log-item">
                      <span class="log-day">Day ${entry.day}</span>
                      <p class="log-copy ${logToneClass(entry.tone)}">${entry.text}</p>
                    </li>
                  `,
                )
                .join('')}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  `;
};

export const mountApp = (root: HTMLDivElement): void => {
  let state = loadState();
  let flash = state.logs[0]?.text ?? 'Warehouse board ready.';
  let timerAnchorMs = Date.now();
  let secondsRemaining = Math.ceil(AUTO_DAY_MS / 1000);
  let chartWindow: ChartWindow = 30;
  let expandedProductIds = new Set<string>();

  const rerender = (): void => {
    root.innerHTML = render(state, flash, secondsRemaining, chartWindow, expandedProductIds);
  };

  const refreshCountdown = (now: number): void => {
    const elapsed = now - timerAnchorMs;
    const remainingMs = AUTO_DAY_MS - (elapsed % AUTO_DAY_MS || 0);
    secondsRemaining = Math.max(1, Math.ceil(remainingMs / 1000));
  };

  const applyDayAdvance = (dayCount: number, source: 'auto' | 'manual'): void => {
    const resultMessages: string[] = [];

    for (let index = 0; index < dayCount; index += 1) {
      const result = advanceDay(state);
      state = result.state;
      resultMessages.push(result.message);
    }

    const listingResult = runAutoListings(state);
    state = listingResult.state;
    if (listingResult.ok) {
      resultMessages.push(listingResult.message);
    }

    const finalMessage = resultMessages.at(-1) ?? 'Another market day rolled over.';
    flash =
      source === 'auto' && dayCount > 1
        ? `${dayCount} market days elapsed while the board stayed open. ${finalMessage}`
        : source === 'auto'
          ? `Market day rolled automatically. ${finalMessage}`
          : finalMessage;
    saveState(state);
  };

  const tickClock = (): void => {
    const now = Date.now();
    const elapsedDays = Math.floor((now - timerAnchorMs) / AUTO_DAY_MS);

    if (elapsedDays > 0) {
      applyDayAdvance(elapsedDays, 'auto');
      timerAnchorMs += elapsedDays * AUTO_DAY_MS;
    }

    refreshCountdown(now);
    rerender();
  };

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('button[data-action]');

    if (!button) {
      return;
    }

    const action = button.dataset.action;

    if (action === 'chart-window') {
      const nextWindow = button.dataset.window;

      if (nextWindow === 'all' || nextWindow === '7' || nextWindow === '30' || nextWindow === '365') {
        chartWindow = nextWindow === 'all' ? 'all' : Number(nextWindow) as Exclude<ChartWindow, 'all'>;
        rerender();
      }

      return;
    }

    if (action === 'expand-all-assets') {
      expandedProductIds = new Set(PRODUCTS.map((product) => product.id));
      rerender();
      return;
    }

    if (action === 'collapse-all-assets') {
      expandedProductIds = new Set<string>();
      rerender();
      return;
    }

    if (action === 'toggle-asset') {
      const productId = button.dataset.productId;

      if (!productId) {
        return;
      }

      const nextExpanded = new Set(expandedProductIds);
      if (nextExpanded.has(productId)) {
        nextExpanded.delete(productId);
      } else {
        nextExpanded.add(productId);
      }
      expandedProductIds = nextExpanded;
      rerender();
      return;
    }

    if (action === 'advance-day') {
      applyDayAdvance(1, 'manual');
      timerAnchorMs = Date.now();
      refreshCountdown(timerAnchorMs);
      rerender();
      return;
    }

    if (action === 'reset-run') {
      const shouldReset = window.confirm('Start a fresh local run? This clears the saved board.');

      if (!shouldReset) {
        return;
      }

      state = resetState();
      flash = 'Opened a fresh board.';
      timerAnchorMs = Date.now();
      refreshCountdown(timerAnchorMs);
      rerender();
      return;
    }

    if (action === 'listing-bump') {
      const productId = button.dataset.productId;
      const direction = Number(button.dataset.direction ?? '0');

      if (!productId || Math.abs(direction) !== 1) {
        return;
      }

      const holding = state.holdings[productId];
      const market = state.markets[productId];
      const baseListing = holding.listingPrice ?? market.price * 1.1;
      const nextListing = baseListing * (1 + direction * 0.05);
      const result = setListingPrice(state, productId, nextListing);
      state = result.state;
      flash = result.message;

      if (result.ok) {
        const listingResult = runAutoListings(state);
        state = listingResult.state;
        if (listingResult.ok) {
          flash = `${flash} ${listingResult.message}`;
        }
        saveState(state);
      }

      rerender();
      return;
    }

    const productId = button.dataset.productId;
    const quantity = Number(button.dataset.quantity ?? '0');

    if (!productId || quantity <= 0) {
      return;
    }

    const result =
      action === 'buy' ? buyUnits(state, productId, quantity) : sellUnits(state, productId, quantity);

    state = result.state;
    flash = result.message;

    if (result.ok) {
      const listingResult = runAutoListings(state);
      state = listingResult.state;
      if (listingResult.ok) {
        flash = `${flash} ${listingResult.message}`;
      }
      saveState(state);
    }

    rerender();
  });

  const timerId = window.setInterval(tickClock, 1_000);
  document.addEventListener('visibilitychange', tickClock);
  window.addEventListener('focus', tickClock);

  refreshCountdown(Date.now());
  rerender();

  window.addEventListener(
    'beforeunload',
    () => {
      window.clearInterval(timerId);
      document.removeEventListener('visibilitychange', tickClock);
      window.removeEventListener('focus', tickClock);
    },
    { once: true },
  );
};
