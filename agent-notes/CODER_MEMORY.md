# Coder TC Memory

This file records dashboard coding work for rollback and continuity.

## Rules

- Keep previous working dashboard versions as rollback points.
- For a new sales dashboard variant, copy from the latest stable version and increment the code name, for example `D13` -> `D14`.
- For a new purchase dashboard variant, copy from the latest stable purchase version and increment/rename only after Руслан confirms the next code name.
- Record every task with: date, request, base version, changed files, verification, rollback note.
- Do not deploy Apps Script or change production spreadsheet data from this repo without explicit approval.

## Current Baseline - 2026-05-18

- Repo: `thecaseruslan-glitch/sales-dashboard`.
- Sales baseline: `sales-dashboard/D13.gs` + `sales-dashboard/D13.html`.
- Purchase baseline: `purchase-dashboard/P5.gs` + `purchase-dashboard/P5.html`.
- Previous repo contents were replaced with Руслан's provided files.
- Rollback: use Git history and previous dashboard code files. Current stable baseline commit: `e4afe7e`.

## Code Read - 2026-05-18

Request: analyze and learn the dashboard code before making changes.

Findings:

- `D13` is the Sales Dashboard Apps Script project: backend in `.gs`, frontend in `.html`.
- `D13.gs` handles auth/session, access control, MoySklad sync, sales refresh, client tag map, balances, product stock, server snapshot/cache, OKR, bonuses, admin/system status.
- `D13.html` is a large single-page admin/manager dashboard using Chart.js and `google.script.run`; it contains many UI modules and accumulated inline CSS/JS.
- `P5` is the Purchase Dashboard Apps Script project.
- `P5.gs` handles purchases, receipts, stock, sales history demand, purchase analysis settings, delivery/carrier/supplier rules, refresh loop, reconciliation, and frontend payload building.
- `P5.html` is a single-page purchase dashboard with tabs for in-transit goods, receipts, and analysis; it supports manual analysis settings and refresh-loop detection.

Risk notes:

- Files are large monoliths, so changes should be narrow and logged.
- Apps Script server calls and frontend function names must stay aligned.
- Sheet/tab names are hard-coded; changing them can break production dashboards.
- Protected Google Sheets data remains read-only unless Руслан explicitly approves writes.

Verification:

- Inspected file structure, Git status, key constants/functions, and frontend server-call names.
- No code behavior changed.

Rollback note:

- No rollback needed for analysis-only work.

## D17 Sales Dashboard Variant - 2026-05-26

Request: create new D17 sales dashboard files from GitHub D16, auto-open/load admin data 10 seconds after dashboard load, and fix OKR plans not being detected from the sheet.

Base version:

- `sales-dashboard/D16`
- `sales-dashboard/D16.html`

Changed files:

- `sales-dashboard/D17`
- `sales-dashboard/D17.html`

Implementation:

- Added locale-safe OKR plan number parsing in backend so values like `11704,06` from `okr_plans` read as real numbers instead of `0`.
- Added frontend OKR plan normalization with the existing comma-aware `parseNumber`.
- Bumped OKR localStorage cache key from `v2` to `v3` so old cached zero-plan payloads do not mask fresh sheet data.
- Added admin auto-open timer: for admin users, 10 seconds after successful dashboard data load the Admin modal opens itself and starts the existing admin bootstrap/load flow.

Verification:

- Pulled latest `origin/main` to get D16.
- Read live `okr_plans` rows in read-only mode and confirmed plan values use comma decimals.
- Ran `node --check sales-dashboard/D17`.
- Extracted and syntax-checked 5 inline JS script blocks from `D17.html` with `new Function`.
- Ran `git diff --check -- sales-dashboard/D17 sales-dashboard/D17.html`.

Rollback note:

- D16 remains unchanged and is the rollback point.

## D18 Sales Dashboard Variant - 2026-05-26

Request: investigate why admin auto-load still looked incomplete and why plans still did not appear in the live dashboard using the main Sales Dashboard System sheet.

Findings:

- Main sheet Sales Dashboard System has May 2026 OKR plans in okr_plans; the source data is present.
- Plan values are stored with comma decimals, for example 10911,06.
- D17 fixed the backend parser, but several frontend Efficiency/OKR calculation paths still wrapped already-normalized plan values with Number(...).
- Browser localStorage could still contain a stale OKR cache from the earlier zero-plan response.
- Admin modal could show final-looking empty brand lists while admin bootstrap was still loading or had failed, making it look like admin data loaded as empty.

Changed files:

- sales-dashboard/D18
- sales-dashboard/D18.html

Implementation:

- Hardened backend OKR month_key normalization for string/date month values.
- Kept comma-safe numeric parsing for OKR plan values.
- Changed remaining frontend plan calculations from Number(...) to the comma-aware parseNumber.
- Bumped OKR frontend cache key to okr_admin_config_v4 to bypass stale zero-plan browser cache.
- Added visible admin bootstrap pending/error states so the modal does not show 0 brands as if loading completed.
- Made admin bootstrap lighter by taking client_ltv_meta from the server snapshot instead of rereading the full sheet during admin open.

Verification:

- Confirmed main okr_plans has May 2026 plans via read-only Sheets API.
- Ran node --check sales-dashboard/D18.
- Extracted and syntax-checked 5 inline JS script blocks from D18.html with new Function.
- Ran git diff --check -- sales-dashboard/D18 sales-dashboard/D18.html.

Rollback note:

- D17 and D16 remain unchanged rollback points.

## D19 Sales Dashboard Variant - 2026-05-26

Request: keep the currently working D18 behavior stable and make two narrow Efficiency KPI changes: disable the “Неліквід” KPI from the assessment by default, and show client lists inside the detail modal for “Нові клієнти”, “Повернуті клієнти”, “Втрати бази 90+”, and “Активні клієнти”.

Base version:

- sales-dashboard/D18
- sales-dashboard/D18.html

Changed files:

- sales-dashboard/D19
- sales-dashboard/D19.html

Implementation:

- Copied D18 to D19 so D18 remains the rollback point.
- Left the backend identical to D18.
- Made the “Неліквід” KPI unchecked and excluded from the total score by default unless explicitly enabled.
- Added client drill-down rows to the KPI modal for new clients, returned clients, newly lost 90+ clients, and active clients.
- Kept the existing non-liquid SKU drill-down inside its modal, but excluded that KPI from the default assessment score.

Verification:

- Confirmed D19 backend matches D18 byte-for-byte.
- Ran node --check sales-dashboard/D19.
- Extracted and syntax-checked 5 inline JS script blocks from D19.html with new Function.
- Ran git diff --check -- sales-dashboard/D19 sales-dashboard/D19.html.

Rollback note:

- D18 remains unchanged and is the rollback point.
