# AGENTS.md - Instructions for Coding Agents

> Inspired by [recurse.bot](https://recurse.bot): record wins, misses, and collaborator signals so every handoff compounds.

## Self-Improvement Directive

Read this file and [TODO.md](/home/pierce/projects/autofac/TODO.md) at the start of every session.

When you learn something important about the codebase, update this file before you stop. Capture:
- Verified build, test, and deploy commands
- Project conventions and naming patterns
- Mistakes to avoid next time
- Useful implementation shortcuts
- Collaborator preferences that affect how work should be presented

Keep entries concrete. Prefer exact commands, paths, and examples over general advice.

## Project Overview

**Autofac** is a mobile-first, local-only warehouse speculation game built as a static web app. The player buys and sells inventory in a fictional same-day delivery market while simulated buyers and rival speculators compete for profit.

### Product Rules
- Use fictional warehouse and product names only.
- Do not reference real companies, brands, or marketplaces in copy or content.
- Keep the tone grounded in logistics and market simulation, not satire.

### Design Direction
- Single-player first
- Mobile browser first
- Static-site deployment compatible with GitHub Pages
- Local persistence first, with room for later multiplayer/networked state
- Simulation clarity over visual noise

## Workflow Rules

- Read `TODO.md` before starting work.
- Keep the TODO current: move finished work to the completed section with the completion date.
- Commit immediately after repo/task setup, then commit after every completed task.
- If a git remote exists, push after every commit.
- Do not batch unrelated tasks into one commit.
- Update this file when you verify a command, discover a pitfall, or learn a collaborator preference.

## Expected Stack

- App shell: Vite + TypeScript
- UI: mobile-first HTML/CSS/TS unless a heavier rendering layer is justified
- Persistence: `localStorage`
- Deployment target: static files in `dist/`
- Future compatibility: keep simulation/state modules separable so a MUD-style schema can be introduced later if needed

## Initial Conventions

- Prefer small, separable simulation modules over one large game loop file.
- Keep domain language warehouse-oriented: SKU, lot, demand pulse, holding cost, rival activity.
- Favor deterministic or seedable simulation helpers where practical so balancing is testable.
- Treat the first playable loop as: advance day, buy inventory, sell inventory, observe demand and price movement.

## Rapport Notes

- The collaborator wants visible momentum: start with a large TODO, then work through it.
- They want a strict commit cadence: initial commit at startup, then one commit per completed task.
- They want recursive self-improvement behavior explicitly documented in this file.
