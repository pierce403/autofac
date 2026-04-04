export const renderAppShell = (): string => `
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Warehouse Speculation Sim</p>
      <h1>Autofac</h1>
      <p class="lede">
        Buy fictional inventory before demand spikes. Liquidate before rivals and holding
        costs punish you.
      </p>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Market Board</h2>
        <span class="pill">Bootstrap Build</span>
      </div>
      <p>
        The first playable loop is next: daily demand movement, buying, selling, and rival
        activity.
      </p>
    </section>

    <section class="panel grid">
      <article class="metric-card">
        <span class="metric-label">Cash</span>
        <strong>$25,000</strong>
        <span class="metric-note">Starting bankroll target</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Warehouse Slots</span>
        <strong>24</strong>
        <span class="metric-note">Planned opening storage cap</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Rivals</span>
        <strong>3</strong>
        <span class="metric-note">AI speculators queued</span>
      </article>
    </section>
  </main>
`;
