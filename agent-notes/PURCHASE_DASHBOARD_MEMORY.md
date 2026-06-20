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
