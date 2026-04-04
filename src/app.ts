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

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`));

const logToneClass = (tone: LogEntry['tone']): string => {
  if (tone === 'trade') {
    return 'trade';
  }

  if (tone === 'warning') {
    return 'warning';
  }

  return 'note';
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

const render = (state: GameState, flash: string): string => {
  const inventoryValue = getInventoryValue(state);
  const usedCapacity = getUsedCapacity(state);
  const netWorth = state.cash + inventoryValue;

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

  const rerender = (): void => {
    root.innerHTML = render(state, flash);
  };

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('button[data-action]');

    if (!button) {
      return;
    }

    const action = button.dataset.action;

    if (action === 'advance-day') {
      const result = advanceDay(state);
      state = result.state;
      flash = result.message;
      saveState(state);
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

  rerender();
};
