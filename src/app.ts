import { PRODUCTS } from './game/content';
import {
  advanceDay,
  buyUnits,
  formatMoney,
  getInventoryValue,
  getProduct,
  getUsedCapacity,
  sellUnits,
} from './game/sim';
import { loadState, resetState, saveState } from './game/storage';
import type { GameState, LogEntry } from './game/types';

const AUTO_DAY_MS = 60_000;

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

const renderProductCard = (state: GameState, productId: string): string => {
  const product = getProduct(productId);
  const market = state.markets[productId];
  const holding = state.holdings[productId];
  const canBuy = state.cash >= market.price && market.supply > 0;
  const canSell = holding.quantity > 0;

  return `
    <article class="product-card">
      <div class="product-topline">
        <div>
          <p class="card-kicker">${product.category}</p>
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
      </dl>

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
      </div>
    </article>
  `;
};

const render = (state: GameState, flash: string, secondsRemaining: number): string => {
  const inventoryValue = getInventoryValue(state);
  const usedCapacity = getUsedCapacity(state);
  const netWorth = state.cash + inventoryValue;
  const countdownProgress = ((AUTO_DAY_MS - secondsRemaining * 1000) / AUTO_DAY_MS) * 100;

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
        <section class="clock-card" aria-label="Market clock">
          <div class="clock-copy">
            <span class="clock-label">Next Market Day</span>
            <strong>${formatCountdown(secondsRemaining)}</strong>
          </div>
          <div class="clock-copy">
            <span class="clock-label">Cadence</span>
            <span class="clock-note">1 live minute = 1 day</span>
          </div>
          <div class="clock-bar" aria-hidden="true">
            <span style="width: ${countdownProgress.toFixed(2)}%"></span>
          </div>
        </section>
        <div class="hero-actions">
          <button class="primary" data-action="advance-day">Advance Day</button>
          <button class="secondary" data-action="reset-run">Reset Run</button>
        </div>
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

      <section class="panel">
        <div class="panel-header">
          <h2>Market Board</h2>
          <span class="pill">Single Player</span>
        </div>
        <div class="product-grid">
          ${PRODUCTS.map((product) => renderProductCard(state, product.id)).join('')}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Rival Desks</h2>
          <span class="pill subtle">${state.rivals.length} active</span>
        </div>
        <div class="product-grid rival-grid">
          ${state.rivals.map((rival) => renderRivalCard(state, rival.id)).join('')}
        </div>
      </section>

      <section class="panel">
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
    </main>
  `;
};

export const mountApp = (root: HTMLDivElement): void => {
  let state = loadState();
  let flash = state.logs[0]?.text ?? 'Warehouse board ready.';
  let timerAnchorMs = Date.now();
  let secondsRemaining = Math.ceil(AUTO_DAY_MS / 1000);

  const rerender = (): void => {
    root.innerHTML = render(state, flash, secondsRemaining);
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
