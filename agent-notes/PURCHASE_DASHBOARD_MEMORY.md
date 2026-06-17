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
