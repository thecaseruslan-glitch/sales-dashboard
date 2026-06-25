# Purchase Dashboard Developer Memory

Dedicated developer memory for the Purchase Dashboard. Keep this separate from sales-dashboard notes so purchase logic does not get mixed with sales logic.

## Current Baseline

- Current files: purchase-dashboard/P5.gs + purchase-dashboard/P5.html.
- Frontend title: Аналіз закупок.
- Backend header: ЗАКУПКИ DASHBOARD - BACKEND v9 / Закупка_4.
- Treat P5 as the active purchase-dashboard baseline until Руслан confirms a new version name.

## Rules

- Do not change purchase spreadsheet data unless Руслан explicitly asks.
- Keep changes narrow because reconciliation, receipts, stock, forecast, and manual overrides are connected.
- For a new purchase variant, copy P5 forward only after Руслан confirms the next code name.
- Do not casually rename hard-coded sheet/tab names.

## Data Sources

- stock_current
- sales_history
- purchase_orders
- receipts
- stock_settings
- carrier_rules
- supplier_code_rules
- purchase_delivery_settings
- purchase_analysis_settings
- system_meta

## Logic To Preserve

- Main product key is code.
- Real physical stock uses stock, not available.
- Forecast availability uses stock + quantity_remaining.
- In transit means quantity_remaining > 0.
- Fully received orders should not appear in active in-transit lists.
- Partial receipts must sum all related receipts.
- Do not deduplicate purchase order rows only by product; one product can appear in multiple orders.
- Use position_id when needed for MoySklad alignment.

## Manual Settings

purchase_analysis_settings can override automatic logic:

- target_stock_days
- manual_order_qty
- status_override
- comment

If manual_order_qty is filled, До замовлення should follow the manual value. If status_override is filled, it should take priority over automatic status.

## Forecast Rules

- Average daily sales = average monthly sales / 30.44.
- Needed qty = average daily sales * (delivery lead time + target stock days).
- Reorder qty = max(0, needed qty - available forecast qty).
- Available forecast qty = current stock + remaining in-transit quantity.

## Product Status Rules

- Новий: product exists but has no sales yet.
- Активний: stable relevant sales.
- Базовий: sells, but not very actively.
- Не брати: no sales in selected period or weak demand.
- В архів: no sales for a long time and no current demand.

## Current Development State

- No recent P5 code changes were made during D17-D20 sales dashboard work.
- P5 remains the purchase-dashboard rollback baseline.
- Before changing purchase business logic, inspect purchase_orders, receipts, stock_current, sales_history, purchase_analysis_settings, and PURCHASES_DASHBOARD_RULES in the spreadsheet when relevant.

### P23 Search Index + Attention Cache - 2026-06-25

Request: P22 still had visible delay when live-search shortened the list; optimize search more deeply.

Base version:

- purchase-dashboard/P22.gs
- purchase-dashboard/P22.html

Changed files:

- purchase-dashboard/P23.gs
- purchase-dashboard/P23.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Implementation:

- Created P23 from P22 as a rollback-safe version.
- Kept backend and business calculations unchanged.
- Added precomputed lowercase _search_text on normalized in-transit, receipt, archive, and product-analysis rows.
- Changed filtering to split the query into tokens once and match against the precomputed row search text instead of rebuilding/lowercasing joined fields for every row on every keystroke.
- Added cached attention-row info so live search in the Analysis tab does not recalculate attention signals repeatedly for the same metric row.
- Kept the P22 short search render timer.

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P23.gs.
- Extracted and syntax-checked 2 P23.html script blocks with new Function.
- Verified P23 no longer contains P22 attention storage keys.
- Verified P23 contains prepared search matching and cached attention functions.
- Ran git diff --check -- purchase-dashboard/P23.gs purchase-dashboard/P23.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.

Rollback note:

- P22 remains the rollback point if the prepared search index needs adjustment.

### P22 Live Search Input Responsiveness - 2026-06-25

Request: live search felt laggy; typed/deleted characters appeared with a 2-3 second delay.

Base version:

- purchase-dashboard/P21.gs
- purchase-dashboard/P21.html

Changed files:

- purchase-dashboard/P22.gs
- purchase-dashboard/P22.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Implementation:

- Created P22 from P21 as a rollback-safe version.
- Kept backend logic unchanged.
- Changed only the search input event path: typing now uses a short 90 ms timer before scheduling the heavy dashboard render, so the browser can show the typed/deleted character immediately.
- Kept status/carrier/sort filter changes on the existing render schedule.
- Updated P22 attention local-storage keys so P22 does not reuse P21 attention state.

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P22.gs.
- Extracted and syntax-checked 2 P22.html script blocks with new Function.
- Verified P22 no longer contains P21 attention storage keys.
- Ran git diff --check -- purchase-dashboard/P22.gs purchase-dashboard/P22.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.

Rollback note:

- P21 remains the rollback point if the search debounce feels too delayed or needs a different timing.

### P21 Five-Digit Product Code Normalization - 2026-06-25

Request: push the leading-zero product-code fix as a new Git version of the purchase dashboard.

Base version:

- purchase-dashboard/P20.gs
- purchase-dashboard/P20.html

Issue: product codes with leading zeroes could split into separate dashboard rows, for example 09872 and 9872, because some sheet/API paths treated product code as a number and lost the leading zero.

Changed files:

- purchase-dashboard/P21.gs
- purchase-dashboard/P21.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Implementation:

- Added product-code normalization for the product code field: digit-only codes are padded to five characters, so 567 becomes 00567 and 9872 becomes 09872.
- Applied the normalized product code to sheet reads, sheet writes, stock/manual setting keys, purchase/receipt/sales row keys, analysis setting keys, product analysis rows, and frontend row/key normalization.
- Left carrier_code, supplier_code, and order_code unchanged so non-product codes are not reformatted.
- No production spreadsheet data was edited and no Apps Script deployment was performed.

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P20.gs.
- Extracted and syntax-checked 2 P20.html script blocks with new Function.
- Ran a small normalization check for 9872 -> 09872, 567 -> 00567, 12345 -> 12345, and non-digit codes unchanged.
- Ran git diff --check -- purchase-dashboard/P20.gs purchase-dashboard/P20.html.

Rollback note:

- P20 remains the rollback point. Revert P21 or switch back to P20 if the source system later guarantees all product codes are always stored as text with leading zeroes preserved.

### P20 Recommended Order Column Restore - 2026-06-22

Request: Руслан clarified that the removed \`Добрати\` column should be returned, but renamed to \`Реком. до замов.\`

Changed files:

- purchase-dashboard/P20.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Implementation:

- Restored the analysis table \`forecast_order_qty\` column in P20.
- Renamed the visible label from \`Добрати\` to \`Реком. до замов.\`
- Did not restore the manual correction or final-order columns, because the request specifically named \`Добрати\`.
- No backend logic or spreadsheet data changed.

Verification:

- Ran \`node --check --input-type=commonjs < purchase-dashboard/P20.gs\`.
- Extracted and syntax-checked the P20.html script block with \`new Function\`.
- Ran \`git diff --check -- purchase-dashboard/P20.html\`.

Rollback note:

- Revert this P20.html display change to hide the recommended-order column again.

## P7 Access Roles - 2026-06-17

Request: create next purchase dashboard version with login/password and role-based access like the sales dashboard, plus Git push.

Base version:

- purchase-dashboard/P6.gs
- purchase-dashboard/P6.html

Changed files:

- purchase-dashboard/P7.gs
- purchase-dashboard/P7.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Implementation:

- Created P7 from the working P6 files, preserving the existing P6 auto-apply refresh changes.
- Added access_control support with headers: email, display_name, role, active, password_hash, temp_password, updated_at.
- Added serverLogin, serverLogout, session cache, SHA-256 password hashing, and runners RUN_26_setupAccessControl / RUN_27_hashTempPasswordsInAccessControl.
- Roles: admin sees all tabs and can save manual purchase settings; manager sees only Товар в дорозі.
- Backend enforces admin-only writes for analysis/manual stock changes; manager payload excludes analysis, receipts, archive, and product-analysis rows.
- Frontend now opens with login screen, stores session token in sessionStorage, shows the current user/role, and hides restricted tabs/actions for managers.

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P7.gs.
- Extracted and syntax-checked the P7.html script block with new Function.
- Verified all callServer(...) frontend functions exist in P7.gs.
- Ran no-index diff checks between P6 and P7 files.

Rollback note:

- P6 remains unchanged as rollback point.

### P7 Access Control Sheet Creation Hotfix - 2026-06-17

Issue: RUN_26_setupAccessControl failed in Apps Script with Exception: Sheet 380304162 not found at getOrCreateSheet -> ss.insertSheet(sheetName).

Fix:

- Hardened getOrCreateSheet in P7.gs.
- It now searches existing sheets by name, tries insertSheet(name, index), then falls back to creating a blank sheet and renaming it.
- Added retry handling for transient Sheet <id> not found spreadsheet errors.

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P7.gs.
- Extracted and syntax-checked the P7.html script block with new Function.
- Ran git diff --check -- purchase-dashboard/P7.gs purchase-dashboard/P7.html.

### P7 Manager Empty In-Transit Fix - 2026-06-17

Issue: manager role opened only the Товар в дорозі tab but saw no rows, while admin saw data.

Cause:

- The frontend currently builds the in-transit state.rows from analysis_rows.
- P7 initially removed analysis_rows from manager payload, so the allowed first tab had no source rows.

Fix:

- Manager payload now keeps analysis_rows because it is required by the current frontend for Товар в дорозі.
- Restricted datasets remain admin-only: receipts_rows, archive_order_rows, and product_analysis_rows.
- Save endpoints remain admin-only on the backend.

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P7.gs.
- Extracted and syntax-checked the P7.html script block with new Function.
- Ran git diff --check -- purchase-dashboard/P7.gs purchase-dashboard/P7.html.

### P7 In-Transit Order Excel Export - 2026-06-17

Request: add a grey translucent download icon opposite each in-transit order that downloads an Excel file for that order.

Implementation:

- Added a download icon next to the order copy icon in P7.html.
- Clicking the icon builds a browser-side Excel-compatible xls file and triggers standard browser download.
- File name format: order number + all order brands, for example NKA-200426-KC - 1:1 Original, Apple Original.xls.
- Export columns: товар, код, бренд, група, Замовлено, Прийнято, В дорозі, Залишок, Відправка, Днів, Прихід, Статус.
- No backend write or sheet data change.

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P7.gs.
- Extracted and syntax-checked the P7.html script block with new Function.
- Ran git diff --check -- purchase-dashboard/P7.html purchase-dashboard/P7.gs.

### P7 Excel Export Icon + Days Format Polish - 2026-06-17

Request: make the download icon cleaner and closer to the copy icon style; in the Excel export, show days as current / planned, e.g. 2 / 40.

Implementation:

- Refined the CSS-only download icon alignment and proportions inside the same 18px translucent grey style as the copy icon.
- Changed the Excel export Days column to output days_in_transit / transit_days.

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P7.gs.
- Extracted and syntax-checked the P7.html script block with new Function.
- Ran git diff --check -- purchase-dashboard/P7.html purchase-dashboard/P7.gs.

### P8 Analysis Period Sales Filter Fix - 2026-06-20

Issue: in the Аналіз tab, changing the main period preset did not reliably change the Продано column. Selecting увесь should make Продано match the all-time sales value.

Base version:

- purchase-dashboard/P7.gs
- purchase-dashboard/P7.html

Cause:

- getCustomAnalysisRange always preferred the date input values when they were filled.
- Period preset buttons updated state.analysisPreset, but the stale date inputs could still drive the calculation range.

Fix:

- Created P8 as the next purchase-dashboard version from P7.
- getCustomAnalysisRange now uses the date inputs only when state.analysisPreset is custom.
- Preset ranges now come directly from getAnalysisPeriodRange.
- The all-time preset clears the visible date inputs.
- Renamed the all-time sales column header from Продано весь час to За весь час to avoid overlap.

Changed files:

- purchase-dashboard/P8.gs
- purchase-dashboard/P8.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P8.gs.
- Extracted and syntax-checked the P8.html script block after replacing the Apps Script template placeholder with {}.
- Ran git diff --check -- purchase-dashboard/P8.gs purchase-dashboard/P8.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.

Rollback note:

- P7 remains unchanged as the rollback point.

### P9 Analysis Table Column Separators - 2026-06-20

Request: add very light, semi-transparent visual stripes to separate all columns in the Аналіз table.

Base version:

- purchase-dashboard/P8.gs
- purchase-dashboard/P8.html

Fix:

- Created P9 as the next purchase-dashboard version from P8.
- Added a subtle 1px rgba vertical border between analysis table columns.
- Kept existing stronger metric group borders unchanged.
- No business logic or data contract changes.

Changed files:

- purchase-dashboard/P9.gs
- purchase-dashboard/P9.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P9.gs.
- Extracted and syntax-checked the P9.html script block after replacing the Apps Script template placeholder with {}.
- Ran git diff --check -- purchase-dashboard/P9.gs purchase-dashboard/P9.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.
- Compared P8 and P9: backend is identical; HTML diff is only the subtle analysis-table separator CSS.

Rollback note:

- P8 remains unchanged as the rollback point.

### P10 Product Trend Modal - 2026-06-20

Request: add a small subtle chart icon after the Код column in the Аналіз table. On click, open a modal with all-time sales dynamics for the selected product, related colors, and related models. Detect product variants by color and model similarly to the sales dashboard.

Base version:

- purchase-dashboard/P9.gs
- purchase-dashboard/P9.html

Implementation:

- Created P10 as the next purchase-dashboard version from P9.
- Added a small semi-transparent chart button after the Код column in the Аналіз table.
- Added a trend modal with three vertically stacked SVG charts:
  - selected position dynamics;
  - color dynamics within the same detected product family and model;
  - model dynamics within the same detected product family.
- Added frontend-only product variant parsing:
  - extracts iPhone model names such as iPhone 17 Pro / iPhone 17 Pro Max;
  - extracts colors from trailing parentheses, e.g. (Green), or common trailing color words;
  - builds a family key from brand, group, and product name after removing model/color/service fragments.
- Uses already loaded product_analysis_rows and sales_daily; no new backend calls, API calls, or sheet writes.

Changed files:

- purchase-dashboard/P10.gs
- purchase-dashboard/P10.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P10.gs.
- Extracted and syntax-checked the P10.html script block after replacing the Apps Script template placeholder with {}.
- Ran git diff --check -- purchase-dashboard/P10.gs purchase-dashboard/P10.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.
- Compared P9 and P10: backend is identical; HTML diff is the trend icon, modal, SVG chart rendering, and product variant grouping logic.

Rollback note:

- P9 remains unchanged as the rollback point.

### P11 Product Trend Modal Polish - 2026-06-20

Request: make the product trend modal wider and taller, make charts visually smoother/nicer like the sales dashboard, add points on monthly values, and show quantities on hover.

Base version:

- purchase-dashboard/P10.gs
- purchase-dashboard/P10.html

Implementation:

- Created P11 as the next purchase-dashboard version from P10.
- Increased the trend modal width and height limits.
- Increased chart height from 190px to 240px and softened the chart card background.
- Replaced polyline chart rendering with smooth cubic SVG paths.
- Added point markers for every month on every chart line.
- Added SVG title tooltips to points with line label, month, and quantity.
- Backend and data contract unchanged.

Changed files:

- purchase-dashboard/P11.gs
- purchase-dashboard/P11.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P11.gs.
- Extracted and syntax-checked the P11.html script block after replacing the Apps Script template placeholder with {}.
- Ran git diff --check -- purchase-dashboard/P11.gs purchase-dashboard/P11.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.
- Compared P10 and P11: backend is identical; HTML diff is modal/chart presentation and SVG smoothing/points only.

Rollback note:

- P10 remains unchanged as the rollback point.

### P12 Product Trend Chart Tooltip + Values - 2026-06-20

Request: fix low-quality trend charts: points were not effectively interactive, hover did not show data, and charts should be more minimalist, stylish, and informative with values.

Base version:

- purchase-dashboard/P11.gs
- purchase-dashboard/P11.html

Implementation:

- Created P12 as the next purchase-dashboard version from P11.
- Replaced passive SVG title-only hover with a custom tooltip inside the trend modal.
- Added transparent hit circles around every monthly point so hover is easier and reliable.
- Added visible numeric labels for all nonzero points on compact single-series charts, and max/latest points on multi-series charts.
- Added Y-axis value labels to the grid for better readability.
- Kept the smooth SVG curve rendering from P11.
- Backend and data contract unchanged.

Changed files:

- purchase-dashboard/P12.gs
- purchase-dashboard/P12.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P12.gs.
- Extracted and syntax-checked the P12.html script block after replacing the Apps Script template placeholder with {}.
- Ran git diff --check -- purchase-dashboard/P12.gs purchase-dashboard/P12.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.
- Compared P11 and P12: backend is identical; HTML diff is chart tooltip, hit zones, visible values, and Y-axis labels.

Rollback note:

- P11 remains unchanged as the rollback point.

### P13 Product Trend Charts Rebuild With Chart.js - 2026-06-20

Request: the SVG trend charts still looked low quality. Rework them after analyzing the D80 sales dashboard chart implementation, make the modal full-screen, and only show color/model charts when those variants actually exist.

Sales dashboard reference:

- D80 uses Chart.js canvas charts with responsive shells, index-mode interaction, native Chart.js tooltips, point hover radius, tension, and clean grid styling.

Base version:

- purchase-dashboard/P12.gs
- purchase-dashboard/P12.html

Implementation:

- Created P13 as the next purchase-dashboard version from P12.
- Added Chart.js via the same CDN pattern as the sales dashboard.
- Changed the trend modal to near full-screen size.
- Rebuilt product trend charts as Chart.js canvas charts instead of custom SVG.
- Kept minimal sales-dashboard-like styling: rounded chart shell, soft gradient background, clean grid, visible point markers, responsive canvas, and native tooltips.
- Added a small value-label plugin to show key values directly on the chart.
- Conditional chart sections:
  - selected product chart always appears;
  - color chart appears only when more than one color group is found;
  - model chart appears only when more than one model group is found.
- Backend and data contract unchanged.

Changed files:

- purchase-dashboard/P13.gs
- purchase-dashboard/P13.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P13.gs.
- Extracted and syntax-checked the P13.html inline script block after replacing the Apps Script template placeholder with {}.
- Ran git diff --check -- purchase-dashboard/P13.gs purchase-dashboard/P13.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.
- Compared P12 and P13: backend is identical; HTML diff is Chart.js loading, full-screen trend modal styling, Chart.js chart rendering, and conditional chart sections.

Rollback note:

- P12 remains unchanged as the rollback point.

### P14 Product Variant Parser For iPad And Generic Devices - 2026-06-20

Request: model recognition works poorly. Example: 12600 / Чохол WIWU для iPad 10.9" [2022]/11" [2025] Classic III Case (Blue). The algorithm must understand that Classic III Case is a product series across many iPad models, and build model/color charts correctly for all positions.

Site check:

- The THE CASE site/search shows WIWU Classic III iPad cases across different groupmodel filters and product cards, including iPad 10.9" [2022]/11" [2025] and iPad 10.2" [2019-2021]/Air3/Pro 10.5".

Base version:

- purchase-dashboard/P13.gs
- purchase-dashboard/P13.html

Implementation:

- Created P14 as the next purchase-dashboard version from P13.
- Expanded variant parser from iPhone-only to generic device model detection:
  - iPhone;
  - iPad;
  - Apple Watch;
  - AirPods;
  - MacBook;
  - Samsung / Galaxy.
- Model extraction now captures compatibility text from the device name until the product series begins, e.g. iPad 10.9" [2022]/11" [2025].
- Family/series cleanup now removes device model before removing year brackets, so iPad compatibility does not leak into the family key.
- Family key now keeps the actual series, e.g. Classic III Case or TechWoven.
- Improved removal of Ukrainian prepositions like для / під and product type prefixes like Чохол.

Parser spot checks:

- WIWU iPad 10.9" [2022]/11" [2025] Classic III Case (Blue) -> family Classic III Case, model iPad 10.9" [2022]/11" [2025], color Blue.
- WIWU iPad 10.2" [2019-2021]/Air3/Pro 10.5" Classic III Case (Black) -> same family Classic III Case, different model, color Black.
- Apple TechWoven iPhone 17 Pro (Green) -> family TechWoven, model iPhone 17 Pro, color Green.

Changed files:

- purchase-dashboard/P14.gs
- purchase-dashboard/P14.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P14.gs.
- Extracted and syntax-checked the P14.html inline script block after replacing the Apps Script template placeholder with {}.
- Ran git diff --check -- purchase-dashboard/P14.gs purchase-dashboard/P14.html agent-notes/PURCHASE_DASHBOARD_MEMORY.md.
- Compared P13 and P14: backend is identical; HTML diff is the variant parser only.

Rollback note:

- P13 remains unchanged as the rollback point.

### P15 Stable Model Grouping For Purchase Trend Modal - 2026-06-20

Request: model recognition still does not work for WIWU Classic III iPad cases. The trend modal must detect different iPad models inside the same product series.

Base version:

- purchase-dashboard/P14.gs
- purchase-dashboard/P14.html

Implementation:

- Created P15 as the next purchase-dashboard version from P14.
- Changed the variant family key from brand + sheet group + series to brand + detected device type + normalized series.
- This avoids splitting one series when group/category values differ between real rows.
- Added device type detection for iPad/iPhone/Apple Watch/AirPods/MacBook/Samsung/Galaxy.
- Normalized series keys so Classic III Case and close naming variants group as the same series key.
- Prevented year-only parentheses like (2024) from being treated as a color.
- Kept Chart.js modal rendering and backend data contract unchanged.

Parser spot checks:

- WIWU iPad 10.9 inch [2022]/11 inch [2025] Classic III Case (Blue) -> familyKey wiwu::ipad::classic iii, model iPad 10.9 inch [2022]/11 inch [2025], color Blue.
- WIWU iPad 10.2 inch [2019-2021]/Air3/Pro 10.5 inch Classic III Case (Black) -> same familyKey wiwu::ipad::classic iii, different model, color Black.
- Apple TechWoven iPhone 17 Pro / 17 Pro Max -> same iPhone TechWoven family, different model keys.

Changed files:

- purchase-dashboard/P15.gs
- purchase-dashboard/P15.html
- agent-notes/PURCHASE_DASHBOARD_MEMORY.md

Verification:

- Ran node --check --input-type=commonjs < purchase-dashboard/P15.gs.
- Extracted and syntax-checked the P15.html inline script blocks after replacing the Apps Script template placeholder with {}.
- Ran git diff --check -- purchase-dashboard/P15.gs purchase-dashboard/P15.html.
- Compared P14 and P15: backend is identical; HTML diff is limited to variant parser grouping.

Rollback note:

- P14 remains unchanged as the rollback point.
