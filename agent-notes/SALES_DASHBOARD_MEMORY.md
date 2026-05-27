# Sales Dashboard Developer Memory

Dedicated developer memory for the Sales Dashboard. Record what changed, what broke, why it broke, what fixed it, what is stable, and what must not be repeated.

## Rules

- Current active line: sales-dashboard/D20 + sales-dashboard/D20.html.
- Keep older versions as rollback points. D16-D20 must stay unless Руслан explicitly asks to remove them.
- Ask for approval before coding dashboard prompts, unless Руслан already confirmed.
- Protected Google Sheets data is read-only unless Руслан explicitly approves writes.
- Backend and frontend contracts must stay aligned.
- Current automatic Apps Script deployment is blocked by Google/OAuth/API configuration; practical path is GitHub push plus manual Apps Script update.

## 2026-05-26 - D17

Base: D16.

Problem: dashboard did not see filled OKR plans, and admin data had to be opened manually.

Cause: OKR plan values in okr_plans used comma decimals such as 11704,06. Some parsing paths treated them as zero. Browser cache could also keep old zero-plan data.

Fix: added comma-safe OKR parsing in backend and frontend, bumped OKR cache key, and added admin auto-open 10 seconds after dashboard load for admin users.

Verification: node --check for D17, inline JS script-block check for D17.html, git diff --check.

Rollback: D16 stayed unchanged.

## 2026-05-26 - D18

Base: D17.

Problem: OKR plans still looked missing in the live dashboard, and admin modal could look loaded while service/admin data was still incomplete.

Cause: source data in the main Sales Dashboard System sheet was valid, but remaining frontend calculations still used Number(...) on comma values. Admin bootstrap had weak pending/error visibility and read heavier data than needed.

Fix: hardened month_key normalization, replaced remaining plan Number(...) paths with comma-aware parsing, bumped OKR cache to okr_admin_config_v4, added admin bootstrap pending/error states, and made admin bootstrap use snapshot client_ltv_meta.

Verification: read-only check confirmed May 2026 okr_plans data exists; node --check, inline JS check, git diff --check.

Rollback: D17 and D16 stayed unchanged.

## 2026-05-26 - D19

Base: D18.

Request: keep D18 stable, make Неліквід informational by default, and show client lists in KPI modals.

Fix: copied D18 to D19, left backend identical, disabled Неліквід from the default total score unless manually enabled, and added client drill-down rows for Нові клієнти, Повернуті клієнти, Втрати бази 90+, Активні клієнти.

Verification: confirmed backend matches D18 byte-for-byte; node --check, inline JS check, git diff --check.

Rollback: D18 stayed unchanged.

## 2026-05-26 - D20 Rename

Base: D19.

Request: rename Пошук Позиції to Аналіз позиції.

Fix: copied D19 to D20, left backend identical, renamed heading and related UI hints/placeholders/top-sales click text.

Verification: confirmed backend matches D19 byte-for-byte; node --check, inline JS check, git diff --check.

Rollback: D19 stayed unchanged.

## 2026-05-26 - D20 Keyword Position Analysis

Base: direct edit to D20 by explicit request. Previous D20 commit before this update: c1c08e8.

Problem: searching terms like ZK Armored did not reliably show all matching 17 Pro / Pro Max items, and Enter could not run a grouped keyword analysis.

Cause: Position Explorer expected a concrete selected product key. Suggestions and product rows were coupled too closely to the current filtered slice.

Fix: added Знайти button, made Enter run search unless a keyboard-highlighted suggestion is active, split full-history suggestion indexing from filtered result rendering, added keyword mode where all terms can match anywhere in product text, preserved exact SKU/product selection, added loader, added first/last sale date, and made client lists work across keyword-matched products.

Verification: node --check for D20, inline JS script-block check for D20.html, git diff --check.

Rollback: D19 is stable rollback. Previous D20 direct-edit baseline is c1c08e8.

## Open Topic - Model Comparison Graph

Requested: add another graph below color comparison to compare models in the same product series. Example: selecting Mist for 17 Pro should also detect Mist for 17, 17 Air, and 17 Pro Max.

Current color logic: detects color from trailing parentheses and treats text before parentheses as the model string.

Risk: model comparison needs a parser that separates product series from phone model. Product names may not be fully uniform.

Recommended implementation: keep color graph unchanged, add a separate model-comparison section below it, parse common model tokens such as 17, 17 Air, 17 Pro, 17 Pro Max, derive series key by removing model and color, then compare matching products by model.

## 2026-05-26 - D20 Universal Model Parser And Model Graph

Base: direct edit to D20 after Руслан confirmed.

Problem: a hard-coded list of current models would fail for future products. Product names can contain compatibility through slash, for example iPhone 16 Pro/17, iPhone 13 Pro Max/14 Plus, iPhone 14 Pro/15/16. The dashboard also needed a model comparison graph below the existing color graph.

Cause: existing color logic only splits trailing color in parentheses and treats the rest as one model string. It does not separate product category, device, compatible models, product series, and color.

Fix:

- Added universal product-name parser for position analysis.
- Parser extracts compatible models as an array, including slash-separated compatibility.
- Parser currently supports common groups/devices: iPhone, Samsung/Galaxy, iPad, MacBook, Apple Watch, AirPods.
- Parser derives a seriesKey by removing detected model/device words and color from the product name.
- Added model comparison graph below the color graph.
- Model graph compares rows with the same series key and device across detected compatible models.
- Compatible SKUs can count under multiple model buckets because one SKU is physically compatible with multiple devices.
- Added search stop-word filtering for words like на, для, і, та, по, so user search phrases do not break matching.
- Increased position suggestions from 8 to 20 items.

Fallback:

- If parser cannot detect models or cannot find at least two comparable models, the model graph stays hidden.
- This avoids breaking the existing position analysis for unknown future naming formats.

Verification:

- node --check sales-dashboard/D20.
- Extracted and syntax-checked 5 inline JS script blocks from D20.html with new Function.
- git diff --check -- sales-dashboard/D20.html.

## 2026-05-26 - D21 Pinned Chart Tooltips And Stronger Model Parser

Base: D20 copied to D21 after Руслан confirmed.

Problem: model comparison worked only for some product names. It failed when the same product series was written with different words/order, and iPad compatibility strings such as `iPad 10.2" [2019-2021]/Air3/Pro 10.5" Classic III Case` were not grouped reliably. Руслан also wanted chart labels to stay visible after clicking a bar/point, and reset when clicking empty chart space.

Cause: D20 compared series keys too strictly and treated iPad model parsing as a simple regex. Product names need two separate concepts: compatible model list and normalized product-series key.

Fix:

- Created D21/D21.html from D20/D20.html.
- Added stronger iPad parser for slash-compatible strings: 10.2 year ranges, Air3/Air 3, Pro 10.5, Mini/Pro/Air variants.
- Changed series matching to normalized terms such as `wiwu classic iii` or `mist`, instead of exact full product-name match.
- Search index now also includes series terms.
- Added reusable Chart.js click-to-pin tooltip helper: click a bar/point to pin its tooltip, click empty chart space to clear and return to normal hover behavior.
- Connected pinned tooltip behavior to the main position chart, color comparison chart, and model comparison chart.

Verification:

- node --check sales-dashboard/D21.
- Extracted and syntax-checked 5 inline JS script blocks from D21.html with new Function.
- git diff --check -- sales-dashboard/D21 sales-dashboard/D21.html agent-notes/SALES_DASHBOARD_MEMORY.md agent-notes/CODER_MEMORY.md.
- Parser sample check confirmed `WIWU Classic III Case` normalizes to seriesKey `wiwu classic iii` and extracts iPad 10.2 2019-2021, iPad Air 3, and iPad Pro 10.5.

## 2026-05-26 - D22 Keyword Color And Model Rankings

Base: D21 copied to D22 after Руслан confirmed.

Request: when the user searches by keywords without selecting a concrete SKU/product, the same color and model ranking blocks should appear as they do for a selected position.

Problem: D21 keyword mode rendered the main position chart and client lists, but color/model comparison blocks stayed hidden because they required `positionExplorerSelectedProduct` as an anchor.

Fix:

- Created D22/D22.html from D21/D21.html.
- Kept backend identical to D21.
- Added keyword-mode aggregation for the color comparison block using all matched rows in the current dashboard/client/filter slice.
- Added keyword-mode aggregation for the model comparison block using parsed compatible models from all matched rows.
- Kept exact selected-product behavior unchanged.
- The “Усі” color button now re-renders the full Position Analysis block, so it works in both selected-product and keyword modes.
- In keyword model ranking, model rows are informational only; selected-product mode keeps clickable model navigation.

Verification:

- Confirmed D22 backend matches D21 byte-for-byte.
- Ran node --check sales-dashboard/D22.
- Extracted and syntax-checked 5 inline JS script blocks from D22.html with new Function.
- Ran git diff --check -- sales-dashboard/D22 sales-dashboard/D22.html agent-notes/SALES_DASHBOARD_MEMORY.md agent-notes/CODER_MEMORY.md.

## 2026-05-27 - D23 Keyword Model/Color Drill Filters

Base: D22 copied to D23.

Request: in Position Analysis keyword mode, model and color ranking rows should work as filters, not only as visual rankings.

Behavior:

- Search by keywords, for example `Skin Pro`, still builds the broad keyword analysis.
- Clicking a model filters the keyword result to that model across all colors and rebuilds charts/client lists.
- Clicking a color filters the keyword result to all models in that color and rebuilds charts/client lists.
- Clicking the second dimension after the first attempts to resolve the exact matching SKU/product and opens it as a concrete selected position.
- The “Усі” color button clears only the color filter and preserves the selected model.

Verification:

- D23 backend matches D22 byte-for-byte.
- node --check sales-dashboard/D23.
- Extracted and syntax-checked 5 inline JS script blocks from D23.html with new Function.
- git diff --check -- sales-dashboard/D23 sales-dashboard/D23.html agent-notes/CODER_MEMORY.md agent-notes/SALES_DASHBOARD_MEMORY.md.

## 2026-05-27 - D24 Quiet Admin Warmup And System Modal

Base: D23 copied to D24.

Request: admin preload should be quiet, System should be separate from admin and visible for all users, and partial admin loading should not make the admin window look ready.

Fix:

- Removed automatic opening of the admin modal after dashboard load.
- Kept silent admin warmup for admins, so service tables still preload in the background.
- Removed the System tab from the admin modal.
- Added a separate top-right `Система` button near `Вийти`.
- Moved live system/loop status into its own modal.
- System live status now requires only an authorized session, not admin rights.
- Added a frontend completeness check for admin bootstrap before setting `adminBootstrapLoaded`; partial payloads retry instead of showing empty/half-loaded admin sections.

Verification:

- node --check sales-dashboard/D24.
- Extracted and syntax-checked 5 inline JS script blocks from D24.html with new Function.
- No `adminSystemTabBtn` references remain.
- Diff whitespace checks passed against D23/D23.html.

## 2026-05-27 - D25 Background Fresh Data Auto-Apply

Base: D24 copied to D25.

Request: the dashboard should keep pulling fresh table/snapshot data while open, without asking the user to click the ready-refresh button. System status should show the actual loop/snapshot state and not get stuck on stale cycle signals.

Fix:

- Background cycle polling now prefetches via `serverGetDashboardDataFresh`.
- Once a fresh payload is ready, the dashboard automatically applies it in the background.
- Current user state is preserved while swapping data: active tab, period, manager/client/service filters, drill selections, and metric.
- Auto-apply waits if the tab is hidden, a modal is open, the user is typing/selecting, or another UI transition is active.
- The refresh-ready button remains as a manual fallback labelled `Застосувати зараз`.
- Backend cycle readiness now treats an idle completed cycle or existing snapshot as ready instead of reporting `cycle_started_at_missing`.
- System status includes Dashboard snapshot and Cycle readiness rows.

Verification:

- node --check sales-dashboard/D25.
- Extracted and syntax-checked 6 inline JS script blocks from D25.html with new Function.
- Diff whitespace checks passed against D24/D24.html.

## 2026-05-27 - D26 Refresh Protocol Diagnostics And Snapshot Gate

Base: D25 copied to D26.

Request: D25 did not reliably bring new shipments into the dashboard and the System modal did not expose useful cycle state. Stabilize the refresh chain and make every step observable.

Fix:

- The refresh loop now has an explicit snapshot rebuild task after balances, stock, and sales repair: `RUN_23_rebuildDashboardServerSnapshot`.
- Cycle readiness requires both sales refresh and `dashboard_server_snapshot_built_at`, so a cycle cannot look complete without a ready snapshot.
- Server snapshots now carry diagnostics: archive/current rows, total sales rows, balance rows, stock rows, and max sales dates.
- Dashboard payloads and refresh signals now expose snapshot built time, state, file id, last error, cycle counter, and cycle completion time.
- Frontend refuses to apply a fresh payload when its snapshot timestamp does not match the timestamp announced by the signal.
- The top refresh strip now shows Snapshot time, making it clear whether the dashboard is looking at a fresh server snapshot.
- The System modal starts in visible live-sync mode and has enough metadata to render real loop/snapshot status for all authorized users.

Verification:

- node --check sales-dashboard/D26.
- Extracted and syntax-checked 6 inline JS script blocks from D26.html with new Function.
- Diff whitespace checks passed against D25/D25.html.

## 2026-05-27 - D27 Simplified No-Admin Dashboard Pipeline

Base: D26 copied to D27.

Request: remove admin from the dashboard for now and rebuild the data update architecture around clear sheet refreshes: sales current month, balances, stock, then one final cache/snapshot rebuild. Keep writing to the same existing sheets and columns, preserving IDs, SKUs, groups, product metadata, and current dashboard logic.

Fix:

- Removed the visible admin entry point and stopped admin warmup/bootstrap from running on dashboard load.
- Main dashboard snapshot no longer carries heavy admin dictionaries.
- Snapshot now contains dashboard runtime data only: archive, current month, balances, stock, bonuses, client statuses, brand settings, meta, and diagnostics.
- Snapshot rebuild no longer syncs brand_list on each rebuild.
- Sales rows still get the existing manager/client/product manual metadata before snapshot write.
- `monthlyRepairNow` now rebuilds current-month sales cache only; it no longer rebuilds the final dashboard snapshot.
- Main refresh-loop order is now sales current month -> balances -> stock -> dashboard snapshot.
- Balances and stock still rewrite the same existing sheets with the same headers.
- Client tag refresh is separated from the main loop and can be installed as a twice-daily trigger: part1 at 05:00/17:00, part2 at 06:00/18:00.
- Frontend gets stock, bonuses, and client statuses directly from the snapshot payload, not from admin bootstrap.

Verification:

- node --check sales-dashboard/D27.
- Extracted and syntax-checked 6 inline JS script blocks from D27.html with new Function.
