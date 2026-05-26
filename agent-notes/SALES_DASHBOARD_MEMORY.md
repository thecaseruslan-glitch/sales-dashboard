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

