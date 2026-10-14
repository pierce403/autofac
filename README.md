# Autofac

Autofac is a mobile-first warehouse speculation game. You buy and sell fictional same-day delivery inventory, compete against simulated buyers and rival speculators, and try to turn demand swings into profit.

Current direction:
- Single-player only
- Local persistence only
- Static web deployment
- Fictional products and worldbuilding only

Execution rules for agents live in [AGENTS.md](/home/pierce/projects/autofac/AGENTS.md), and the working queue lives in [TODO.md](/home/pierce/projects/autofac/TODO.md).

## Cloudflare publishing

Native Cloudflare Git builds publish `main`; credentials stay in Cloudflare and
previews are disabled. The existing Vite generator supplies `dist`, with
a no-store revision marker and terminal404 handling. Validate with `npm ci`,
the existing tests, and `npm run check:deploy`. `npm run deploy` is the native
deploy command. GitHub Pages and source history remain recovery sources.
