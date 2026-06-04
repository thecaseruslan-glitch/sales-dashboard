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

## D20 Sales Dashboard Variant - 2026-05-26

Request: continue from the stable D19 dashboard and make a narrow Position Explorer naming change: rename the “Пошук Позиції” block to “Аналіз позиції”.

Base version:

- sales-dashboard/D19
- sales-dashboard/D19.html

Changed files:

- sales-dashboard/D20
- sales-dashboard/D20.html

Implementation:

- Copied D19 to D20 so D19 remains the rollback point.
- Left the backend identical to D19.
- Renamed the visible block heading to “Аналіз позиції”.
- Updated related UI hints, input placeholder, clear-button aria label, and top-sales click hints to use the new block name.

Verification:

- Confirmed D20 backend matches D19 byte-for-byte.
- Ran node --check sales-dashboard/D20.
- Extracted and syntax-checked 5 inline JS script blocks from D20.html with new Function.
- Ran git diff --check -- sales-dashboard/D20 sales-dashboard/D20.html.

Rollback note:

- D19 remains unchanged and is the rollback point.

## D20 Position Analysis Search Update - 2026-05-26

Request: for this prompt only, continue editing D20 directly. Improve the “Аналіз позиції” block so product suggestions are built from the full available product history, keyword search like “ZK Armored” can analyze all matching products without selecting a specific SKU, Enter and a new “Знайти” button trigger rendering, rendering shows a loader, and the chart meta shows first/last sale date.

Base version:

- sales-dashboard/D20
- sales-dashboard/D20.html

Changed files:

- sales-dashboard/D20.html

Implementation:

- Added a “Знайти” button next to the product search input.
- Changed Enter in the product search field to run the same search action unless a suggestion is actively selected with keyboard navigation.
- Split suggestion indexing from result filtering: suggestions now use all accessible sales history plus stock, while the rendered result still respects the current period/client/manager/service filters.
- Added keyword search mode: entering multiple keywords without selecting a suggestion finds products whose searchable text contains all keywords, even when the words are not adjacent.
- Kept exact product selection behavior for selecting a specific product/SKU from the dropdown or top-sales table.
- Added loader state while the analysis is being rendered.
- Added first and last sale dates to the chart meta for the current rendered selection.
- Adjusted client lists for keyword search so they show clients across all matching products.

Verification:

- Ran node --check sales-dashboard/D20.
- Extracted and syntax-checked 5 inline JS script blocks from D20.html with new Function.
- Ran git diff --check -- sales-dashboard/D20 sales-dashboard/D20.html.

Rollback note:

- D19 remains unchanged. Previous D20 commit before this direct update is c1c08e8.

## D20 Universal Model Parser And Model Graph - 2026-05-26

Request: continue editing D20 directly. Build a universal parser for product models across all product groups, account for slash-compatible models, fix search phrases with service words, and add a model comparison chart below the existing color chart.

Changed files:

- sales-dashboard/D20.html
- agent-notes/SALES_DASHBOARD_MEMORY.md

Implementation:

- Added parser functions that extract device, compatible model array, series key, and color from product names.
- Added slash compatibility handling, for example iPhone 16 Pro/17 and iPhone 13 Pro Max/14 Plus.
- Added support for common device groups: iPhone, Samsung/Galaxy, iPad, MacBook, Apple Watch, AirPods.
- Added a new “Порівняння Моделей Серії” chart below the color comparison chart.
- Added model ranking list and clickable model rows that switch to a matching product when possible.
- Added search stop-word filtering and increased product suggestions to 20.

Verification:

- Ran node --check sales-dashboard/D20.
- Extracted and syntax-checked 5 inline JS script blocks from D20.html with new Function.

## D58 Clients Tab KPI And Charts Update - 2026-06-04

Request: continue from D58 and update the "Клієнти" tab: make all client KPI cards clickable with explanation modals, add two more vertical charts and two more vertical donut diagrams, and extend the client list to the bottom of its sidebar block.

Base version:

- sales-dashboard/D58
- sales-dashboard/D58.html

Changed files:

- sales-dashboard/D58.html

Implementation:

- Made all Clients 360 KPI cards clickable via the existing KPI detail modal.
- Added per-KPI Ukrainian business explanations and current selected-client values.
- Rebuilt the Clients 360 chart area into two vertical stacks: three line/bar charts and three donut diagrams.
- Added charts for "Замовлення + середній чек", "Зміна % кошика клієнта", and "Загальна сума ($)" using existing client rows.
- Added donut diagrams for brand, category, and group structure, without reverse analytics.
- Changed the client sidebar to a flex column so the client list fills the available block height.

Verification:

- Ran node --check sales-dashboard/D58.
- Extracted and syntax-checked 5 inline JS script blocks from D58.html with new Function.
- Ran git diff --check -- sales-dashboard/D58.html.
- Checked references for new chart canvas IDs and meta IDs.

Rollback note:

- Previous D58 state is available through Git history; older D54-D57 versions remain unchanged.

## D58 Clients Donut Lists Update - 2026-06-04

Request: in the Clients tab donut blocks, move the circles as far left as possible and add a scrollable list on the right for brands, categories, and groups, matching the Products tab list pattern with a different layout.

Base version:

- sales-dashboard/D58.html at commit 07686d5

Changed files:

- sales-dashboard/D58.html

Implementation:

- Converted each Clients 360 donut block into a two-column layout: donut on the left, scrollable list on the right.
- Disabled Chart.js bottom legends for these donut charts so the right-side lists become the primary legend/detail.
- Added right-side scroll lists with name, value, and percentage for brand/category/group entries.

Verification:

- Ran node --check sales-dashboard/D58.
- Extracted and syntax-checked 5 inline JS script blocks from D58.html with new Function.
- Ran git diff --check -- sales-dashboard/D58.html.

Rollback note:

- Previous D58 client KPI/charts commit is 07686d5.

## D59 Clients Basket Coverage And Top Products - 2026-06-04

Request: create new D59 version from D58 and apply additional Clients tab updates: show basket coverage percentage inside each donut, add 12 months/all-time toggles, replace "Потенціал кошика" KPI with client basket percentage, remove stock quantities from manager recommendations, extend client list to dashboard bottom, show LTV and manager tag per client card, and add searchable top products for the selected client.

Base version:

- sales-dashboard/D58
- sales-dashboard/D58.html

Changed files:

- sales-dashboard/D59
- sales-dashboard/D59.html

Implementation:

- Copied D58 backend/frontend to D59.
- Added Clients 360 basket coverage calculations for brands, categories, groups, and overall matrix coverage.
- Added synchronized "12 міс / увесь" toggles for donut blocks; default is 12 months.
- Added center percentages for brand/category/group donuts.
- Replaced the basket KPI value with 12-month client basket coverage percentage.
- Updated the KPI explanation modal for the new basket KPI.
- Removed stock quantities from generated manager recommendation product suggestions.
- Changed the client sidebar to stretch down the full dashboard column and show manager tag plus LTV in each client card.
- Added a searchable "Топ позицій" block for the selected client.

Verification:

- Ran node --check sales-dashboard/D59.
- Extracted and syntax-checked 5 inline JS script blocks from D59.html with new Function.
- Ran git diff --check -- sales-dashboard/D59 sales-dashboard/D59.html.
- Reviewed D58 -> D59 diff for the Clients 360 section.

Rollback note:

- D58 remains unchanged and is the rollback point.

## D59 Clients Sidebar Stretch Fix - 2026-06-04

Request: fix D59 layout because only the left client list should stretch; the right-side Clients tab blocks must not be stretched.

Changed files:

- sales-dashboard/D59.html

Implementation:

- Restored the Clients 360 grid alignment to start so right-side blocks keep natural height.
- Kept the left client sidebar/list as a sticky fixed-height column with internal scrolling.

Verification:

- Ran git diff --check -- sales-dashboard/D59.html agent-notes/CODER_MEMORY.md.

Rollback note:

- Previous D59 commit is 06b21e4.

## D59 Clients Main Period Dependency Fix - 2026-06-04

Request: fix D59 Clients tab blocks so they react to the main month/period filter.

Changed files:

- sales-dashboard/D59.html

Implementation:

- Added Clients 360 period bounds based on the main dateFrom/dateTo filters.
- When a main period is selected, client rows, KPIs, donut entries, charts, and top products use that period.
- When no main period is selected, Clients 360 keeps the default last-12-month behavior.
- Kept the all-time basket toggle available for donut coverage comparisons.

Verification:

- Ran node --check sales-dashboard/D59.
- Extracted and syntax-checked 5 inline JS script blocks from D59.html with new Function.
- Ran git diff --check -- sales-dashboard/D59.html.

Rollback note:

- Previous D59 layout-fix commit is d7694cb.

## D59 Clients Charts Scope Toggle Fix - 2026-06-04

Request: adjust D59 because Clients tab charts and diagrams should show the last 12 months by default, and when the diagram toggle switches to all-time, the charts should also switch to all-time.

Changed files:

- sales-dashboard/D59.html

Implementation:

- Added a separate chart/donut row source for Clients 360.
- Kept client list/KPI filtering tied to the main period where applicable.
- Made the shared 12 months/all-time toggle control both the three charts and the three donut diagrams.
- Default chart/donut scope remains last 12 months; all-time scope uses full client history.

Verification:

- Ran node --check sales-dashboard/D59.
- Extracted and syntax-checked 5 inline JS script blocks from D59.html with new Function.
- Ran git diff --check -- sales-dashboard/D59.html.

Rollback note:

- Previous D59 period-filter commit is 5af9cb7.

## D59 Clients Top Products And Hover Sync - 2026-06-04

Request: update D59 Clients tab so the selected client's Top Products list matches the Products tab list style with larger height, synchronize chart tooltips across all three client charts by period point, and keep the left client list stable regardless of the selected main period.

Changed files:

- sales-dashboard/D59.html

Implementation:

- Converted Clients Top Products to the shared top-list/top-item visual pattern and increased list height.
- Kept product meta inside each row: code, brand/group/category, quantity, and check count.
- Removed the period-row existence requirement from the client list, so all clients with sales history remain visible even when the selected period has no sales for them.
- Added synchronized hover state for the three Clients charts: orders + avg check, basket %, and total revenue.

Verification:

- Ran node --check sales-dashboard/D59.
- Extracted and syntax-checked 5 inline JS script blocks from D59.html with new Function.
- Ran git diff --check -- sales-dashboard/D59.html.

Rollback note:

- Previous D59 chart-scope commit is 28dd7d3.

## D59 Clients Top Products Empty Fix - 2026-06-04

Request: fix the Clients tab Top Products block because it was not displaying.

Changed files:

- sales-dashboard/D59.html

Implementation:

- Top Products now uses selected-period rows when the client has sales in the selected period.
- If the selected client has no sales in the selected period, Top Products falls back to the client's full sales history so the block still displays.
- The Top Products meta text now shows whether values are from the selected period or full client history.

Verification:

- Ran node --check sales-dashboard/D59.
- Extracted and syntax-checked 5 inline JS script blocks from D59.html with new Function.
- Ran git diff --check -- sales-dashboard/D59.html.

Rollback note:

- Previous D59 top-products/hover commit is 0d09f6e.

## D59 Clients Top Products Scope Toggle - 2026-06-04

Request: add a small all/period toggle to the Clients tab Top Products block, with all-time selected by default.

Changed files:

- sales-dashboard/D59.html

Implementation:

- Added an all/period toggle in the Top Products toolbar.
- Default Top Products scope is all client history.
- Period scope shows products only from the selected main period.
- Search continues to filter within the selected Top Products scope.

Verification:

- Ran node --check sales-dashboard/D59.
- Extracted and syntax-checked 5 inline JS script blocks from D59.html with new Function.
- Ran git diff --check -- sales-dashboard/D59.html.

Rollback note:

- Previous D59 top-products empty-state commit is 3648edd.

## D45 Dual-Cycle Snapshot Variant - 2026-05-31

Request: base the new sales dashboard variant on the user-provided D45 reference, keep two independent loops, make sales/balances/stock run separately from the snapshot cycle, rebuild the dashboard snapshot every 20 minutes, and let the dashboard open from the prepared snapshot immediately in the background.

Base version:

- user-provided D45 attachment copied into repo as sales-dashboard/D45 + sales-dashboard/D45.html

Changed files:

- sales-dashboard/D45
- sales-dashboard/D45.html

Implementation:

- Kept the main refresh loop independent for sales, balances, and stock.
- Added a separate snapshot scheduler trigger that runs every 20 minutes via a minute tick.
- Made RUN_42_rebuildDashboardFastPreparedFilesNow perform the snapshot build flow so the manual entrypoint matches the user's requested workflow.
- Added explicit install/stop entrypoints for the dashboard snapshot trigger.
- Changed startRefreshLoop() / stopRefreshLoop() to also manage the snapshot trigger.
- Made the frontend cache-first: it now reads the last local snapshot immediately, falls back by last user email, then syncs server data in the background.
- Stored the last login email in sessionStorage so the local snapshot survives token changes.

Verification:

- Ran node --check D45.
- Parsed all 6 inline JS script blocks from D45.html with vm.Script.
- Ran git diff --check -- D45 D45.html.

Cleanup follow-up:

- Removed obsolete legacy wrappers from D45: RUN_05B_refreshLoopHeartbeatNow, rebuildDashboardServerSnapshotFullNow_, rebuildDashboardServerSnapshotInsideLockedFlow_, refreshLoopHeartbeat_, refreshLoopWatchdog_, runSalesRefreshLoopStep_, runBalancesRefreshLoopStep_, runStockRefreshLoopStep_, publishSalesRefreshLoopStep_, publishBalancesRefreshLoopStep_, publishStockRefreshLoopStep_, refreshClientTagMapNow, and the dead helper removeRefreshLoopStepTriggers_.

Tag cycle update:

- Added a dedicated client-tag refresh start/stop pair in D45: RUN_46_startClientTagMapRefreshTrigger and RUN_47_stopClientTagMapRefreshTrigger.
- New client-tag scheduler runs at 09:00, 14:00, and 17:00 via clientTagMapDailySchedulerTick_, then continues through the existing continuation trigger until the refresh completes.
- installClientTagMapDailyTrigger() is now a compatibility alias to the new start function.
- startRefreshLoop() / stopRefreshLoop() now also manage the client-tag refresh trigger so the tag cycle starts and stops together with the main loop.

Rollback note:

- The new files are additive. D32 remains an untouched rollback point, and the user-provided D45 attachment remains available in /root/.openclaw/media/inbound/.
- Ran git diff --check -- sales-dashboard/D20.html.

Rollback note:

- D19 remains the stable rollback point.
- Previous D20 direct-edit commits remain available in Git history.

## D21 Pinned Chart Tooltips And Stronger Model Parser - 2026-05-26

Request: create new dashboard files after D20. Make chart bars/points clickable so a tooltip stays pinned for the clicked element and clears when clicking empty chart space. Also fix model-series detection for products where the same series is written with different model formats, especially iPad compatibility such as WIWU Classic III Case for `iPad 10.2" [2019-2021]/Air3/Pro 10.5"`.

Base version:

- sales-dashboard/D20
- sales-dashboard/D20.html

Changed files:

- sales-dashboard/D21
- sales-dashboard/D21.html
- agent-notes/SALES_DASHBOARD_MEMORY.md
- agent-notes/CODER_MEMORY.md

Implementation:

- Copied D20 to D21 so D20 remains the rollback point.
- Added click-to-pin tooltip helpers for Chart.js and wired them into the main position chart, color comparison chart, and model comparison chart.
- Improved iPad parsing for slash-compatible names: size/year ranges, Air3/Air 3, Pro 10.5, Mini/Pro/Air variants.
- Reworked series matching from strict full-name matching to normalized term matching, for example `wiwu classic iii` and `mist`.
- Added series terms to product search indexing so suggestions and keyword search can match series names more reliably.

Verification:

- Ran node --check sales-dashboard/D21.
- Extracted and syntax-checked 5 inline JS script blocks from D21.html with new Function.
- Ran git diff --check -- sales-dashboard/D21 sales-dashboard/D21.html agent-notes/SALES_DASHBOARD_MEMORY.md agent-notes/CODER_MEMORY.md.
- Ran parser sample check: WIWU iPad Classic III Case parsed to iPad 10.2 2019-2021, iPad Air 3, iPad Pro 10.5 with seriesKey `wiwu classic iii`; Mist iPhone slash sample parsed to iPhone 17, iPhone 17 Air, iPhone 17 Pro Max with seriesKey `mist`.

Rollback note:

- D20 remains unchanged and is the rollback point.

## D22 Keyword Color And Model Rankings - 2026-05-26

Request: create a new version after D21. In keyword search mode, when the user enters words and presses “Знайти” without choosing a concrete SKU, also show the color and model ranking/comparison blocks.

Base version:

- sales-dashboard/D21
- sales-dashboard/D21.html

Changed files:

- sales-dashboard/D22
- sales-dashboard/D22.html
- agent-notes/SALES_DASHBOARD_MEMORY.md
- agent-notes/CODER_MEMORY.md

Implementation:

- Copied D21 to D22 so D21 remains the rollback point.
- Kept backend identical to D21.
- Added renderPositionKeywordColorComparison(rows, label), which builds color totals and monthly chart datasets from all keyword-matched rows.
- Added renderPositionKeywordModelComparison(rows, label), which builds model totals and monthly chart datasets from all keyword-matched rows using the D21 parser.
- RenderPositionExplorer now calls the keyword color/model charts when there is an active keyword query and no selected product.
- Adjusted the “Усі” color button to re-render the whole Position Analysis block so it resets color filtering in both modes.
- Kept selected-product color/model behavior unchanged.

Verification:

- Confirmed D22 backend matches D21 byte-for-byte.
- Ran node --check sales-dashboard/D22.
- Extracted and syntax-checked 5 inline JS script blocks from D22.html with new Function.
- Ran git diff --check -- sales-dashboard/D22 sales-dashboard/D22.html agent-notes/SALES_DASHBOARD_MEMORY.md agent-notes/CODER_MEMORY.md.

Rollback note:

- D21 remains unchanged and is the rollback point.

## D23 Keyword Model/Color Drill Filters - 2026-05-27

Request: after keyword search such as `Skin Pro`, make clicks on model/color rankings act as filters. Clicking a model should rebuild charts and client lists for that model across all colors. Clicking a color first should rebuild analysis for all models in that color. If both model and color are selected, switch to the exact matching SKU/product when available.

Base version:

- sales-dashboard/D22
- sales-dashboard/D22.html

Changed files:

- sales-dashboard/D23
- sales-dashboard/D23.html
- agent-notes/CODER_MEMORY.md
- agent-notes/SALES_DASHBOARD_MEMORY.md

Implementation:

- Copied D22 to D23 so D22 remains the rollback point.
- Kept backend identical to D22.
- Added keyword-mode state for selected model alongside the existing selected color.
- Filtered keyword-matched rows by selected model and/or color before building the main chart and client lists.
- Made keyword-mode model ranking rows clickable.
- Made keyword-mode color ranking clicks preserve model/color drill state.
- Added exact SKU/product activation when a keyword-selected model and color match a concrete product.

Verification:

- Confirmed D23 backend matches D22 byte-for-byte.
- Ran node --check sales-dashboard/D23.
- Extracted and syntax-checked 5 inline JS script blocks from D23.html with new Function.
- Ran git diff --check -- sales-dashboard/D23 sales-dashboard/D23.html agent-notes/CODER_MEMORY.md agent-notes/SALES_DASHBOARD_MEMORY.md.

Rollback note:

- D22 remains unchanged and is the rollback point.

## D24 Quiet Admin Warmup And System Modal - 2026-05-27

Request: create the next dashboard version. Make admin bootstrap load quietly without opening the admin modal, remove the System tab from admin, move System to a separate top-right button near Logout available to all users, and fix cases where admin loaded only the System tab/partial payload.

Base version:

- sales-dashboard/D23
- sales-dashboard/D23.html

Changed files:

- sales-dashboard/D24
- sales-dashboard/D24.html
- agent-notes/CODER_MEMORY.md
- agent-notes/SALES_DASHBOARD_MEMORY.md

Implementation:

- Copied D23 to D24 so D23 remains the rollback point.
- Stopped auto-opening the admin modal after dashboard load; the existing warmup still silently queues admin bootstrap for admins.
- Removed the System tab from the admin modal.
- Added a separate top-right `Система` button near `Вийти`.
- Moved the live System UI into its own modal and made live polling depend on that modal being open.
- Changed `serverGetAdminSystemLiveStatus` from admin-only to any authorized dashboard user, so managers can see system/loop state.
- Added frontend validation for full admin bootstrap payload before setting `adminBootstrapLoaded = true`; partial system-only payloads now trigger retry instead of making admin look loaded.

Verification:

- Ran node --check sales-dashboard/D24.
- Extracted and syntax-checked 5 inline JS script blocks from D24.html with new Function.
- Confirmed no `adminSystemTabBtn` references remain.
- Ran diff whitespace checks against D23/D23.html.

Rollback note:

- D23 remains unchanged and is the rollback point.

## D25 Background Fresh Data Auto-Apply - 2026-05-27

Request: improve the refresh/update system. When the dashboard is open it should continuously pull fresh data from the backend/sheets/snapshot in the background, apply it without requiring the user to click the refresh-ready button, and show a truthful System cycle state.

Base version:

- sales-dashboard/D24
- sales-dashboard/D24.html

Changed files:

- sales-dashboard/D25
- sales-dashboard/D25.html
- agent-notes/CODER_MEMORY.md
- agent-notes/SALES_DASHBOARD_MEMORY.md

Implementation:

- Copied D24 to D25 so D24 remains the rollback point.
- Changed background prefetch to call serverGetDashboardDataFresh instead of the cached serverGetDashboardData.
- Added automatic application of a prepared fresh payload after prefetch, with manual `Застосувати зараз` kept as a fallback.
- Preserved the current view, period, manager/client/service filters, drill selections, and chart metric while replacing the data payload.
- Delayed auto-apply while the tab is hidden, a modal is open, an input/select is focused, or another UI transition is running.
- Added cycle readiness into System status and treated an idle completed cycle/snapshot as ready instead of showing `cycle_started_at_missing`.
- Added System rows for Dashboard snapshot and Cycle readiness.

Verification:

- Ran node --check sales-dashboard/D25.
- Extracted and syntax-checked 6 inline JS script blocks from D25.html with new Function.
- Ran whitespace/diff checks against D24/D24.html.

Rollback note:

- D24 remains unchanged and is the rollback point.

## D26 Refresh Protocol Diagnostics And Snapshot Gate - 2026-05-27

Request: D25 did not work reliably in practice: new shipments were not appearing, shipment refresh time did not clearly update, and the System modal showed no useful cycle state. Create a stabilizing version that makes the update chain observable and only applies a fresh complete snapshot.

Base version:

- sales-dashboard/D25
- sales-dashboard/D25.html

Changed files:

- sales-dashboard/D26
- sales-dashboard/D26.html
- agent-notes/CODER_MEMORY.md
- agent-notes/SALES_DASHBOARD_MEMORY.md

Implementation:

- Copied D25 to D26 so D25 remains the rollback point.
- Changed refresh-loop task order version and made `RUN_23_rebuildDashboardServerSnapshot` an explicit loop task after balances, stock, and sales repair.
- Made cycle readiness require `dashboard_server_snapshot_built_at`, not only `sales_last_refresh`.
- Added snapshot diagnostics to server snapshot/payload: archive/current row counts, total rows, balance/stock rows, max sales dates.
- Added snapshot metadata to dashboard meta and refresh signal: snapshot state, built time, file id, last error, cycle counter/completed time.
- Frontend now validates that a fetched fresh payload matches the snapshot timestamp advertised by the refresh signal before applying it.
- Top refresh strip now shows Snapshot time alongside shipments, balances, stock, and tags.
- System modal now starts with a visible live-sync state and has enough metadata to render cycle/snapshot state for any authorized user.

Verification:

- Ran node --check sales-dashboard/D26.
- Extracted and syntax-checked 6 inline JS script blocks from D26.html with new Function.
- Ran whitespace/diff checks against D25/D25.html.

Rollback note:

- D25 remains unchanged and is the rollback point.

## D27 Simplified No-Admin Dashboard Pipeline - 2026-05-27

Request: fully simplify the dashboard architecture while keeping dashboard analytics behavior. Remove admin from the user-facing dashboard, keep writing data into the same existing sheets/columns, keep all current IDs/SKUs/groups/metadata, and rebuild the refresh cycle around simple sheet rewrites plus one final cache/snapshot rebuild.

Base version:

- sales-dashboard/D26
- sales-dashboard/D26.html

Changed files:

- sales-dashboard/D27
- sales-dashboard/D27.html
- agent-notes/CODER_MEMORY.md
- agent-notes/SALES_DASHBOARD_MEMORY.md

Implementation:

- Copied D26 to D27 so D26 remains the rollback point.
- Removed the visible admin entry point and stopped admin warmup/bootstrap from running during dashboard load.
- Simplified the server snapshot payload: it now stores dashboard data only, using existing sheets/fields: archive, current month, balances, product stock, bonuses, client statuses, and brand settings.
- Removed heavy admin dictionaries from the main snapshot payload and stopped syncing brand_list during every snapshot rebuild.
- Kept product/manual/group metadata applied to sales rows before snapshot write, preserving the existing dashboard classification behavior.
- Changed `monthlyRepairNow` to rebuild only current-month sales cache, not the final dashboard snapshot.
- Reordered the main refresh loop to: sales current month, balances, stock, final dashboard snapshot.
- Kept balances and stock refreshes writing into the same existing sheets with the same headers.
- Re-enabled the client-tag refresh trigger as a separate twice-daily cycle per Руслан's requested start times: part1 at 09:00/17:00 and part2 at 10:00/18:00.
- Frontend now receives product stock, bonuses, and client statuses from the main snapshot payload instead of the admin payload.

Verification:

- Ran node --check sales-dashboard/D27.
- Extracted and syntax-checked 6 inline JS script blocks from D27.html with new Function.

Rollback note:

- D26 remains unchanged and is the rollback point.

## D28 Atomic JSON Snapshot And Live Revision Sync - 2026-05-31

Request: simplify the sales dashboard refresh system to one repeating four-step loop, make the dashboard open from the latest ready JSON snapshot, publish and apply new snapshots automatically, show truthful live System state, keep tags independent, support manual first-snapshot initialization, and fix OKR plans not appearing reliably.

Base version:

- `sales-dashboard/D27`
- `sales-dashboard/D27.html`

Changed files:

- `sales-dashboard/D28`
- `sales-dashboard/D28.html`
- `agent-notes/CODER_MEMORY.md`
- `agent-notes/SALES_DASHBOARD_MEMORY.md`

Implementation:

- Kept the main loop at exactly four steps: current-month sales, balances, stock, final JSON snapshot.
- Added `RUN_23_rebuildDashboardSnapshotNow()` as an explicit manual first-snapshot/recovery entry point using the same internal builder as loop step 4.
- Changed browser fresh-data reads so they only read the latest published JSON snapshot; browser polling no longer rebuilds a snapshot.
- Added snapshot revision numbers, required-block validation, gzip readback validation, and atomic publication: create and validate the new file first, then publish its file id/revision/state and trash the previous file.
- Added `building` snapshot state and revision metadata to the dashboard payload, refresh heartbeat, cache key, and System status.
- Moved `client_ltv_meta` into the JSON snapshot so normal dashboard loads do not reread that sheet.
- Added OKR plans/default tags to JSON. The small OKR config endpoint still prefers a live read with JSON fallback so a manually saved plan appears immediately before the next loop snapshot.
- Added OKR snapshot invalidation after manual plan save.
- Kept frontend heartbeat polling at 30 seconds and made it compare snapshot revisions before background-prefetching and atomically applying the ready payload.
- Fixed the fallback-cache sync edge case: a heartbeat signal no longer marks a server revision as already loaded before that JSON payload has actually been applied in the browser.
- Made System show the real four-step order, server/browser snapshot revisions, and a separate lower row for independent tag refresh state.
- Added stale-task healing at the start of the scheduler tick.

Verification:

- Ran `node --check sales-dashboard/D28`.
- Extracted and syntax-checked 5 inline JS script blocks from `D28.html` with `new Function`.
- Ran `git diff --no-index --check` against `D27` and `D27.html`.
- Ran static invariant checks for the four-task order, manual rebuild entry point, no-rebuild browser fresh endpoint, 30-second heartbeat, revision metadata, and independent tag state.

Rollback note:

- D27 remains unchanged and is the rollback point.
- D28 is local code only; no Apps Script deployment or production Sheet write was performed.

## D29 Independent Table Loop And 20-Minute JSON Snapshot Scheduler - 2026-05-31

Request: simplify D28 further. Keep the main sheet refresh loop independent with only sales, balances, and stock. Build JSON snapshots independently every 20 minutes from whichever rows are already present in the sheets at that moment. Let the open dashboard pick up each published JSON revision in the background. Reduce the System table to the useful timestamps only.

Base version:

- `sales-dashboard/D28`
- `sales-dashboard/D28.html`

Changed files:

- `sales-dashboard/D29`
- `sales-dashboard/D29.html`
- `agent-notes/CODER_MEMORY.md`
- `agent-notes/SALES_DASHBOARD_MEMORY.md`

Implementation:

- Removed JSON snapshot rebuild from the main scheduler task list. The repeating main loop is now exactly: current-month sales -> balances -> stock -> repeat.
- Added independent `dashboardSnapshotSchedulerTick_()` and `RUN_34_installDashboardSnapshotRefreshTrigger()`.
- Apps Script does not support a direct `everyMinutes(20)` trigger. Installed a lightweight supported 5-minute tick that rebuilds only when at least 20 minutes have passed since the previous snapshot run.
- `RUN_01_startRefreshLoop()` now installs both the one-minute main scheduler and the independent snapshot scheduler. `RUN_02_stopRefreshLoop()` stops both. `RUN_35_stopDashboardSnapshotRefreshTrigger()` can stop only JSON refresh.
- Changed `RUN_23_rebuildDashboardSnapshotNow()` to rebuild independently without taking the main scheduler ScriptLock. It snapshots the sheet state that already exists at runtime.
- Kept atomic JSON publication and added a separate active-build marker to avoid overlapping JSON rebuilds without coupling to the main loop's `fresh/stale` state.
- Browser heartbeat is no longer gated by main-cycle readiness. It can background-load any newly published JSON revision even while the main sheet loop continues.
- Simplified System table rows to: sales, balances, stock, JSON snapshot, independent tags. Removed the redundant cycle-readiness row.

Verification:

- Ran `node --check sales-dashboard/D29`.
- Extracted and syntax-checked 5 inline JS script blocks from `D29.html` with `new Function`.
- Ran `git diff --no-index --check` against `D28` and `D28.html`.
- Ran static invariant checks for the exact three-task main loop, independent snapshot scheduler, supported 5-minute Apps Script trigger, effective 20-minute rebuild interval, lock-free independent snapshot rebuild, and browser sync independent from main-cycle readiness.

Rollback note:

- D28 remains unchanged and is the rollback point.
- D29 is local code only; no Apps Script deployment or production Sheet write was performed.

## D30 Resumable Sales Step, OKR Read Fix, And Single-Snapshot Startup Optimization - 2026-05-31

Request: keep the D29 architecture with an independent three-step sheet loop and one independent gzip JSON snapshot, fix the observed sales-loop retry state, restore reliable OKR plan reads, and speed up dashboard startup without splitting the snapshot into prepared files.

Base version:

- `sales-dashboard/D29`
- `sales-dashboard/D29.html`

Changed files:

- `sales-dashboard/D30`
- `sales-dashboard/D30.html`
- `agent-notes/CODER_MEMORY.md`
- `agent-notes/SALES_DASHBOARD_MEMORY.md`

Implementation:

- Kept the visible main loop exactly: sales -> balances -> stock. The independent 20-minute single gzip JSON snapshot scheduler remains unchanged.
- Split scheduled sales refresh into two resumable internal phases: rewrite current-month source rows, then rebuild the current-month cache on the next scheduler pass. Manual `RUN_06_monthlyRepairNow()` still performs both phases in one call.
- Added immediate stale-task healing when a timed-out sales execution already reached the cache-pending checkpoint.
- Normalized OKR month keys and manager tags for live reads and writes, and bumped the frontend OKR localStorage cache key to invalidate stale cached plans.
- Removed an unused full-archive `collectProductOptionsForAdmin()` computation from the normal snapshot-open path. The result was calculated but never returned to the browser.
- Avoided an unnecessary `archive.concat(current)` allocation while building snapshot diagnostics.

Verification:

- Ran `node --check sales-dashboard/D30`.
- Extracted and syntax-checked 5 inline JS script blocks from `D30.html` with `new Function`.
- Ran `git diff --no-index --check` against `D29` and `D29.html`.
- Ran static invariants for the exact three-task loop, resumable sales phase, independent 20-minute scheduler, one gzip snapshot, removed unused open-time computation, and normalized OKR path.

Rollback note:

- D29 remains unchanged and is the rollback point.
- D30 is local code only; no Apps Script deployment or production Sheet write was performed.

## D31 Snapshot Retry Timestamp Fix - 2026-05-31

Request: explain and fix why an independent 20-minute JSON snapshot refresh could still fail to publish a new snapshot after the sales loop reported an error.

Base version:

- `sales-dashboard/D30`
- `sales-dashboard/D30.html`

Changed files:

- `sales-dashboard/D31`
- `sales-dashboard/D31.html`
- `agent-notes/CODER_MEMORY.md`
- `agent-notes/SALES_DASHBOARD_MEMORY.md`

Implementation:

- Found that `dashboardSnapshotSchedulerTick_()` stored the last-run timestamp before snapshot publication completed. A failed build therefore delayed the next attempt for another 20-minute interval.
- Added a separate `dashboard_server_snapshot_scheduler_last_attempt_at` meta field.
- The existing last-run timestamp is now written only after the new gzip JSON snapshot has been built and atomically published successfully.
- Caught snapshot-build failures clear the active-build marker, allowing the next 5-minute scheduler tick to retry instead of waiting for the full interval.
- Exposed last-attempt and last-success timestamps in snapshot meta, refresh signal, and System status for diagnostics.

Verification:

- Ran `node --check sales-dashboard/D31`.
- Extracted and syntax-checked 5 inline JS blocks from `D31.html`.
- Ran `git diff --no-index --check` against D30 files.
- Ran static invariants for the three-task main loop, independent scheduler, separate attempt/success timestamps, post-publication success recording, retry-marker cleanup, and one gzip snapshot.

Rollback note:

- D30 remains unchanged and is the rollback point.
- D31 is local code only; no Apps Script deployment or production Sheet write was performed.

## D46 Cold-Start Reload And 60-Second Loading Bar - 2026-05-31

Request: create D46 from D45 and make a full browser refresh behave like a true first load while still pulling the latest prepared snapshot. Also make the dashboard loading bar progress smoothly over 60 seconds.

Base version:

- sales-dashboard/D45
- sales-dashboard/D45.html

Changed files:

- sales-dashboard/D46
- sales-dashboard/D46.html
- agent-notes/CODER_MEMORY.md

Implementation:

- Kept the D45 backend as-is and copied it into a new D46 variant.
- Made the frontend show the cold-start loading screen on every authenticated page load, so a browser refresh visibly restarts the dashboard bootstrap instead of appearing inert.
- Kept local snapshot bootstrap enabled, but stopped hiding the loading overlay immediately after the cached snapshot is painted. The dashboard now stays in loading mode until the fresh server payload is applied or the bootstrap fails.
- Replaced the old stepped loading timer with an elapsed-time progress timer that advances linearly across 60 seconds and updates the loading step text in stages.

Verification:

- Ran node --check sales-dashboard/D46.
- Extracted and syntax-checked 6 inline JS script blocks from D46.html with vm.Script.
- Ran git diff --check -- sales-dashboard/D46 sales-dashboard/D46.html.

Rollback note:

- D45 remains the rollback point.
- D46 is local code only; no Apps Script deployment or production Sheet write was performed.

## D47 Manual Client Status Controls - 2026-05-31

Request: create D47 from D46. Add manual client-status management so an admin can remove a client from the "new" set (for example iDesign, where old history before 2024 should not count as new) and persist that change back to the sheet. Also remove the background phrase that said data were quietly updated in the background.

Base version:

- sales-dashboard/D46
- sales-dashboard/D46.html

Changed files:

- sales-dashboard/D47
- sales-dashboard/D47.html
- agent-notes/CODER_MEMORY.md

Implementation:

- Kept the D46 cold-start/full-refresh behavior and loading bar work.
- Expanded the admin client status table to show active/inactive rows and added a per-row toggle action so a status can be removed or restored directly from the table.
- Kept persistence through the existing client_status_map queue/save flow, so manual status removal still writes to the sheet.
- Removed the auto-apply status phrase that said data were quietly updated in the background.

Verification:

- Ran node --check sales-dashboard/D47.
- Ran git diff --check -- sales-dashboard/D47 sales-dashboard/D47.html.

Rollback note:

- D46 remains the rollback point.
- D47 is local code only; no Apps Script deployment or production Sheet write was performed.

## D51 Status Save Loader and No-Status Bonus Suppression - 2026-05-31

Request: create D51 from D50. Fix the status admin save flow so the loader appears before reload, and when a client is cleared the sheet should record a no status row rather than keeping new; clients cleared this way must disappear from the bonuses tab while keeping the rest of the bonus flow intact.

Base version:

- sales-dashboard/D50
- sales-dashboard/D50.html

Changed files:

- sales-dashboard/D51
- sales-dashboard/D51.html
- agent-notes/CODER_MEMORY.md

Implementation:

- Added an explicit cursor busy indicator and UI busy state before the status save request starts, plus a paint yield so the loader is visible before the reload begins.
- Kept the loading overlay active through the save and refresh flow and only released the busy indicators in the final cleanup path.
- Changed the backend status clear path to write none into client_status_map with active=false instead of storing new.
- Extended the bonus suppression check so inactive new or none status rows hide the client from the bonuses tab, while the main bonus calculation flow remains unchanged.

Verification:

- Ran node --check D51.
- Ran git diff --check.
- Verified the updated D51 frontend/backend references with ripgrep.

Rollback note:

- D50 remains the rollback point.
- D51 is local code only; no Apps Script deployment or production Sheet write was performed.

## D52 Status Save Sequencing and Explicit No-Status Append - 2026-05-31

Request: create D52 from D51. Fix the status save flow so the loader is visible before the dashboard refresh, and ensure clearing a client status always persists a no status row in client_status_map even when no prior row exists.

Base version:

- sales-dashboard/D51
- sales-dashboard/D51.html

Changed files:

- sales-dashboard/D52
- sales-dashboard/D52.html
- agent-notes/CODER_MEMORY.md

Implementation:

- Wrapped the save flow in the shared UI transition helper so the busy indicators survive until the save and refresh sequence finishes.
- Forced a fresh admin bootstrap after the save and reloaded the dashboard without local snapshot fallback so the updated sheet state is used immediately.
- Changed the backend remove-all path to append a none row with active=false when no existing status row is found, instead of silently doing nothing.
- Kept the bonuses suppression rule aligned with inactive new or none rows so clients removed from new stay out of the bonuses tab.

Verification:

- Ran node --check D52.
- Ran git diff --check.
- Verified the patched save path and backend append path with ripgrep.

Rollback note:

- D51 remains the rollback point.
- D52 is local code only; no Apps Script deployment or production Sheet write was performed.

## D53 Full Server Refresh Bootstrap and Quiet Background Sync - 2026-06-01

Request: create D53 from D52. Make an ordinary browser refresh behave like a full dashboard opening instead of immediately painting a potentially stale local snapshot, and remove the user-facing service messages shown after cached/background synchronization.

Base version:

- sales-dashboard/D52
- sales-dashboard/D52.html

Changed files:

- sales-dashboard/D53
- sales-dashboard/D53.html
- agent-notes/CODER_MEMORY.md

Implementation:

- Kept the D52 backend unchanged and copied it into D53.
- Changed authenticated page load and post-login bootstrap to wait for the server dashboard payload before painting the normal dashboard state.
- Kept IndexedDB dashboard snapshot reads only as the existing server-error fallback path.
- Removed the green service status messages after normal loading and background prefetch/apply so background synchronization stays quiet.
- Kept refresh-button state labels for the manual fallback case where automatic apply is temporarily blocked by an active input or modal.
- Kept wake checks on pageshow, focus, and visibilitychange so an open tab can recover polling after browser sleep.

Verification:

- Ran node --check sales-dashboard/D53.
- Extracted and syntax-checked 6 inline JS script blocks from D53.html with vm.Script.
- Ran git diff --no-index --check against D52.html.
- Verified D53 backend is byte-identical to D52.
- Verified normal load/login use preferLocalSnapshot:false, server-error IndexedDB fallback remains present, removed service phrases are absent, and wake listeners remain present.

Rollback note:

- D52 remains the rollback point.
- D53 is local code only; no Apps Script deployment or production Sheet write was performed.

## D54 Clients 360 Variant - 2026-06-03

Request: create a new sales dashboard version with a visually structured `Клієнти` tab between `Менеджери` and `Баланси`, focused on a read-only client 360 card without contact/task buttons.

Base version:

- `sales-dashboard/D53`
- `sales-dashboard/D53.html`

Changed files:

- `sales-dashboard/D54`
- `sales-dashboard/D54.html`

Implementation:

- Copied D53 to D54 so D53 remains the rollback point; backend is unchanged.
- Added `Клієнти` to sidebar and top navigation.
- Added a two-column client workspace: prioritized searchable client list on the left and a detailed client 360 card on the right.
- Added client KPI blocks for revenue, typical monthly turnover, cycle progress, average check, interval, basket potential, balance, and overdue debt.
- Added a single primary recommendation that prioritizes overdue debt before sales recommendations.
- Added compact revenue trend and basket structure charts.
- Added basket-gap recommendations based on similar active clients by annual revenue quartile, with estimated potential and in-stock SKU suggestions.
- Added in-stock recurring products that are due for replenishment and regular products not purchased for 90+ days.
- Kept the feature read-only: no task buttons, no contact log, no Google Sheet writes, and no Apps Script deployment.

Verification:

- Confirmed `sales-dashboard/D54` is byte-identical to `sales-dashboard/D53`.
- Ran `node --check sales-dashboard/D54`.
- Extracted and syntax-checked 5 inline JS blocks from `D54.html` with `new Function`.
- Ran a no-index diff whitespace check between D53.html and D54.html.
- Checked HTML ID / `getElementById` references; D54 introduces no new missing IDs. The existing D53 `toggleAdminBtn` missing reference remains unchanged.

Rollback note:

- D53 remains unchanged and is the rollback point.

## D58 Clients Grid With D54 Values - 2026-06-03

Request: create D58 from the user-supplied working D55 files, preserve the D55 `Клієнти` tab width/grid, and restore the client values and analysis available in GitHub D54.

Changed files:

- `sales-dashboard/D58`
- `sales-dashboard/D58.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Copied the user-supplied D55 backend and HTML into new rollback-safe D58 files.
- Preserved the D55 full-width clients shell and `310px + remaining width` desktop grid unchanged.
- Restored D54 client calculations for lifecycle status, monthly target, cycle progress, average check, average interval, peer-based basket potential, balances, overdue stop-factor, and stock-backed product suggestions.
- Restored the D54 percentage dynamics and structured `Аналіз клієнта` blocks inside the D55 grid.
- Kept the backend code unchanged from the user-supplied D55 and did not deploy Apps Script or modify Google Sheets.

Verification:

- Ran `node --check sales-dashboard/D58` successfully.
- Parsed all inline `<script>` blocks in `D58.html` with `new Function` successfully.
- Checked literal HTML ID / `getElementById` references; no new missing IDs were introduced. Existing `toggleAdminBtn` remains unchanged.
- Confirmed the D55 clients width/grid CSS declarations are byte-identical in D58.
- Ran whitespace checks against the new D58 HTML diff successfully.
- Local browser preview was unavailable because browser policy blocked `localhost` navigation.

Rollback note:

- The user-supplied D55 files remain the direct rollback source; D54 remains available in git history for the restored client values.

## D57 Clients Separate Tab Entrypoint - 2026-06-03

Request: ship version 57 and make the standalone Clients tab the active entrypoint, while keeping the wide efficiency-style grid and preventing routing into Efficiency.

Changed files:

- `sales-dashboard/D57.html`
- `sales-dashboard/Index.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Copied the clean D56 clients-tab build to D57.
- Added `Index.html` as the Apps Script entrypoint copy so `doGet()` resolves to the standalone Clients implementation.
- Kept `clients` as its own dashboard view with the wide `efficiency-layout` / `efficiency-card` shell.

Verification:

- Confirmed no `clients -> efficiency` routing remains in `D57.html` or `Index.html`.
- Ran `git diff --check` after creating the new files.

## D56 Clients Separate Tab Cleaned - 2026-06-03

Request: ship a clean new version where `Клієнти` stays a standalone tab, without any routing into `Ефективність`, but still uses the same grid language.

Changed files:

- `sales-dashboard/D55.html`
- `sales-dashboard/D56.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Removed the leftover `dashboardFocusSection` state from the clients navigation path.
- Kept `clientsView` as its own hidden-view tab and left the efficiency grid shell inside the clients card.
- Copied the cleaned `D55.html` into `D56.html` as the new versioned file.

Verification:

- Confirmed `clientsView` is separate in `D56.html`.
- Confirmed there is no `clients -> efficiency` routing string left in `D56.html`.
- Ran `git diff --check` successfully.
- Parsed all inline `<script>` blocks in `D56.html` with `new Function` successfully.

## D54 Clients Full-Width Shell - 2026-06-03

Request: make the `Клієнти` tab use the same full work-area width feel as `Товари`, without side padding on the outer shell.

Changed files:

- `sales-dashboard/D54.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Removed the outer padding from the `Клієнти` root card so the view shell reaches the full available width.
- Moved the padding into the `Клієнти` header and workspace containers so the content still has internal spacing, but the outer edges remain flush.

Verification:

- Ran `git -C projects/sales-dashboard diff --check`.
- Reviewed the focused diff for `sales-dashboard/D54.html`.

Rollback note:

- The previous `D54` HTML state remains available in git history.

## D59 Clients Chart Point Products Modal - 2026-06-04

Request: allow clicking a point on any Clients tab chart to open a modal with the sold products for that point's period.

Changed files:

- `sales-dashboard/D59.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Added cached Clients 360 chart source rows and monthly buckets while rendering the three client charts.
- Added `openClients360ChartPointProducts(index)` to collect rows for the clicked month and aggregate products with the same product-row builder used by the top-products table.
- Added Chart.js `onClick` handling in the existing Clients 360 chart hover-sync binding, so all three charts open the same sold-products modal by point index.
- Reused the existing KPI detail modal for the products list: product/code plus revenue, quantity, shipment count, and last sale date.

Verification:

- Ran `node --check sales-dashboard/D59`.
- Extracted and syntax-checked all inline script blocks from `sales-dashboard/D59.html` with `new Function`.
- Verified the chart-click tokens exist.
- Ran `git diff --check -- sales-dashboard/D59.html`.

Rollback note:

- Commit `f931ab4` is the rollback point before this chart-click modal change.

## D59 Clients Live Search Performance Fix - 2026-06-04

Request: fix lag when typing in live search fields for products and clients; typing was freezing for a few seconds before text appeared.

Changed files:

- `sales-dashboard/D59.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Debounced the `Клієнти` list search so the full Clients 360 dashboard is not rebuilt synchronously on every keypress.
- Changed the embedded `Топ позицій` search/filter/sort controls to rerender only the top-products table for the selected client instead of the full Clients tab.
- Added a Clients 360 items cache for this lightweight table rerender.
- Debounced the client search input in the `Товари` modal and precomputed lowercase client names for faster suggestion filtering.

Verification:

- Ran `node --check sales-dashboard/D59`.
- Extracted and syntax-checked all inline script blocks from `sales-dashboard/D59.html` with `new Function`.
- Verified the new search optimization tokens exist.
- Ran `git diff --check -- sales-dashboard/D59.html`.

Rollback note:

- Commit `eaebba1` is the rollback point before this live-search performance hotfix.

## D59 Clients Top Products Embedded Modal Clone - 2026-06-04

Request: rebuild the `Топ позицій` block in the `Клієнти` tab so it matches the product/client modal list from the `Товари` tab, with its own independent filters.

Changed files:

- `sales-dashboard/D59.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Replaced the simple top-list in `Клієнти` with the same `client-trend-products` table pattern used by the `Товари` client modal.
- Added independent controls for the embedded Clients block: `увесь/період`, search, brand filter, category filter, group filter, sortable columns, and reset sorting.
- Reused `buildClientTrendProductRows` so the embedded block follows the same product grouping and default model-line sorting as the modal.
- Added category/group metadata to the shared product-row builder so the new embedded filters have the needed values.

Verification:

- Ran `node --check sales-dashboard/D59`.
- Extracted and syntax-checked all inline script blocks from `sales-dashboard/D59.html` with `new Function`.
- Verified the new `clients360TopProducts*` HTML IDs exist and are not duplicated.
- Ran `git diff --check -- sales-dashboard/D59.html agent-notes/CODER_MEMORY.md`.

Rollback note:

- D58 remains unchanged as the rollback version; D59 history also contains the previous top-products implementation.

## D54 Clients Moved Into Efficiency - 2026-06-03

Request: move the `Клієнти` tab into the `Ефективність` view as the lower block and keep the efficiency grid width / wrapper behavior.

Changed files:

- `sales-dashboard/D54.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Embedded the full `Клієнти 360°` block as the last `efficiency-span-12` section inside `Ефективність`.
- Removed the separate standalone `Клієнти` tab view state and made the Clients nav point to the efficiency page plus the embedded block.
- Kept the existing client 360 rendering logic intact and wired it to render from within the efficiency view.

Verification:

- Ran `git -C projects/sales-dashboard diff --check`.
- Checked that `clientsView` appears only once in `D54.html` and now sits within the efficiency layout.

Rollback note:

- The previous `D54` HTML state remains available in git history.

## D54 Clients Side-Gutter Removal - 2026-06-03

Request: remove the remaining side gutter from the `Клієнти` tab so it matches the flush outer width feel of `Товари`.

Changed files:

- `sales-dashboard/D54.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Removed the last horizontal padding from the `Клієнти` header and workspace shell.
- Kept the inner cards and list panels padded, so the tab is flush on the outside but still readable inside.

Verification:

- Ran `git -C projects/sales-dashboard diff --check`.
- Reviewed the focused diff for `sales-dashboard/D54.html`.

Rollback note:

- The previous `D54` HTML state remains available in git history.
## D54 Full-Width Grid Fix - 2026-06-03
Request: fix the dashboard grid so the main blocks use the full available display width and do not leave empty side space on wide screens.
Changed files:
- `sales-dashboard/D54.html`
- `agent-notes/CODER_MEMORY.md`
Implementation:
- Removed the final large-screen width cap from the main `.wrap` container.
- Kept the sidebar offset intact so the content still sits to the right of the fixed CRM rail, but now stretches to the full available viewport width.
Verification:
- Ran `git -C projects/sales-dashboard diff --check`.
- Reviewed the resulting diff for `sales-dashboard/D54.html`.
Rollback note:
- The previous `D54` HTML state remains available in git history.

## D54 Manual Previous-Month Refresh Fix - 2026-06-03

Request: make `RUN_11_refreshPreviousMonthNow` perform the same lightweight targeted refresh pattern as `RUN_06_monthlyRepairNow`, but keep RUN_11 manual-only for rewriting the previous month.

Changed files:

- `sales-dashboard/D54`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Kept `RUN_11_refreshPreviousMonthNow` as a standalone manual entry point and did not add it to the automatic refresh loop.
- Changed `rebuildMonthByYearMonth` to expose its freshly fetched unique rows to internal callers.
- Added `writeArchiveMonthServerCacheRows_` to replace only the selected month inside `sales_archive` instead of rebuilding the entire sales cache from `sales_lines_test`.
- Changed `refreshPreviousMonthNow` to update the previous month in the main sales sheet, update the matching archive month, rebuild the prepared archive output, and mark the full dashboard snapshot stale.
- Removed the heavy `rebuildSalesCacheAndSnapshot_` call from RUN_11, which was timing out after the month had already been rewritten.

Verification:

- Ran `node --check sales-dashboard/D54`.
- Ran `git diff --check`.
- Confirmed `RUN_11_refreshPreviousMonthNow` is not present in `getRefreshLoopTasks_`; the automatic loop still references `RUN_06_monthlyRepairNow`.

Rollback note:

- Commit `1a91cef` is the rollback point for this backend-only RUN_11 change.

## D54 Clients 360 Refinement - 2026-06-03

Request: refine the existing D54 client card based on the first visual review: use the full available width, add deeper manager guidance, selected-client percentage dynamics, cycle progress, and a structured client analysis block.

Changed files:

- `sales-dashboard/D54.html`
- `agent-notes/CODER_MEMORY.md`

Implementation:

- Strengthened the full-width layout rules for the `Клієнти` view while keeping the searchable client list and client card workspace.
- Replaced the short recommendation with a 2-4 sentence practical recommendation based on cycle progress, basket gaps, available SKU, month-to-month trend, and overdue debt when present.
- Added a selected-client percentage dynamics block for the last six months.
- Added a full-width current-period client progress scale matching the logic used in `Клієнти у зоні дії`.
- Added a structured `Аналіз клієнта` block with amount, order, and average-check changes plus result, trend, and action-plan narratives.
- Removed the visible similar-client percentage from opportunity rows and removed the `Спочатку оплата` header status.
- Added `Новий` and `Повернутий після паузи` client statuses while retaining debt as a KPI and recommendation stop-factor.
- Kept the backend, Google Sheets, and Apps Script deployment unchanged.

Verification:

- Confirmed `sales-dashboard/D54` remains byte-identical to `sales-dashboard/D53`.
- Ran `node --check sales-dashboard/D54`.
- Extracted and syntax-checked inline JavaScript blocks from `D54.html` with `new Function`.
- Ran `git diff --check`.
- Checked HTML ID / `getElementById` references; no new missing IDs were introduced. The existing `toggleAdminBtn` missing reference remains unchanged.
- Confirmed the visible strings `Схожі:` and `Спочатку оплата` are absent from D54.

Rollback note:

- D53 remains unchanged and is the rollback point.
