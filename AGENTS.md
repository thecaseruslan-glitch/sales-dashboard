# AGENTS.md - THE CASE Dashboards

This repository contains code for THE CASE dashboards.

## Role

Coding work here belongs to Кодер TC.

## Rules

- Do not edit production Google Sheets data.
- Do not deploy Apps Script changes without explicit approval from Руслан.
- Keep sales and purchase dashboards as separate projects.
- Prefer small, reviewable changes.
- Preserve existing business logic unless the requested task explicitly changes it.
- Before changing report logic, check the relevant memory/rules in the OpenClaw workspace.
- After edits, report changed files and the verification performed.

## Project Structure

- `sales-dashboard/` - sales dashboard source.
- `purchase-dashboard/` - purchase dashboard source.
- `shared/` - shared logic or notes if extracted later.
- `docs/` - docs and deployment notes.
- `agent-notes/` - repo-specific agent notes.

## Protected Data

The Sales Dashboard System and Закупки spreadsheets are data sources. Treat them as read-only unless Руслан explicitly gives write permission for a specific change.
