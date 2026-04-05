# TODO - Autofac

> Agent rule: read this file at the start of every session. Commit after every completed task, and push too if a remote exists.

## Active / In Progress

- [ ] **[WORLD-1]** Define the fictional setting, warehouse voice, and product taxonomy for the game world

## Next Up

- [ ] **[WORLD-2]** Create a roster of fictional repeat-purchase staples with seasonality, perishability, and storage profile metadata
- [ ] **[SIM-2]** Add warehouse replenishment rules, supplier lead times, and stockout behavior
- [ ] **[SIM-3]** Add holding costs, spoilage/obsolescence risk, and inventory aging
- [ ] **[SIM-4]** Add distinct buyer archetypes with different price sensitivity and urgency
- [ ] **[SIM-5]** Add rival personalities with separate bankroll, strategy, and risk tolerance
- [ ] **[SIM-6]** Add daily market summaries and explainable event logs for why prices moved
- [ ] **[UX-1]** Create a thumb-friendly market dashboard for phones
- [ ] **[UX-2]** Add product detail sheets showing seasonality, scarcity, and recent transaction range
- [ ] **[UX-3]** Add a portfolio/performance view with realized profit, unrealized profit, and exposure by category
- [ ] **[UX-4]** Add onboarding copy and short scenario-based tutorial prompts
- [ ] **[SAVE-1]** Persist game state to localStorage with versioned migrations
- [ ] **[SAVE-2]** Add reset/new-run flow with confirmation
- [ ] **[BAL-1]** Tune the opening economy so early mistakes are recoverable without becoming trivial
- [ ] **[BAL-2]** Add difficulty presets that change volatility, rival aggression, and replenishment rates
- [ ] **[CONTENT-1]** Add more staple categories: canned goods, noodles, baking goods, toiletries, oral care, paper goods
- [ ] **[TECH-1]** Split simulation logic from UI so future multiplayer or server authority is possible
- [ ] **[TECH-2]** Add deterministic seed support for replayable scenarios
- [ ] **[TECH-3]** Add smoke tests for the daily simulation loop

## Backlog

- [ ] **[META-1]** Add challenge modes with fixed starting cash and scenario constraints
- [ ] **[META-2]** Add leaderboard-ready score calculation for a future multiplayer release
- [ ] **[META-3]** Add asynchronous multiplayer market snapshots if the game expands beyond local-only play
- [ ] **[AUDIO-1]** Add restrained warehouse ambience and market tick SFX
- [ ] **[ART-1]** Develop a visual language for crates, labels, demand charts, and scarcity indicators
- [ ] **[NARR-1]** Add faction flavor via fictional warehouse districts and buyers without using real companies

## Completed

- [x] **[SETUP-1]** Initialize git repo with `main` as default branch - 2026-04-04
- [x] **[SETUP-2]** Create `AGENTS.md` and the initial execution-focused `TODO.md` - 2026-04-04
- [x] **[SETUP-3]** Bootstrap the static mobile-first app stack with Vite + TypeScript and a GitHub Pages-friendly build - 2026-04-04
- [x] **[GAME-1]** Implement the first playable market loop: day advance, cash, inventory, demand-driven pricing - 2026-04-04
- [x] **[GAME-2]** Add rival speculator activity that competes for scarce warehouse supply - 2026-04-04
- [x] **[DEPLOY-1]** Add GitHub Pages deployment notes and base-path handling - 2026-04-04
- [x] **[TIME-1]** Add a live market clock so each 60 seconds on-site advances one day - 2026-04-04
- [x] **[UX-5]** Make the market layout read cleanly on desktop without compromising the mobile-first flow - 2026-04-04
- [x] **[GAME-3]** Add listing automation, gain/loss visibility, and per-product price trails for held inventory - 2026-04-05
- [x] **[UX-6]** Replace textual price trails with timeframe charts and compact the day controls into a donut timer cluster - 2026-04-05
- [x] **[UX-7]** Convert the market board into a collapsible asset list with expand-all and collapse-all controls - 2026-04-05
- [x] **[SIM-1]** Build a demand model with baseline demand, seasonal modifiers, price elasticity, and short-lived demand spikes - 2026-04-05
- [x] **[CONTENT-2]** Add local news bulletins that create temporary demand and supply shocks across the district board - 2026-04-05
- [x] **[CONTENT-3]** Refocus the opening catalog on repeat-purchase shelf-stable foods and toiletries - 2026-04-05
