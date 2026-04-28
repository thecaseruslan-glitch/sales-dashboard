// ======================================================
// SALES DASHBOARD SYSTEM | CLEAN CODE.GS
// HtmlService + secure login + sales/payments sync
// ======================================================

// --------------------------------------------------
// QUICK RUN FUNCTIONS
// --------------------------------------------------

const MANUAL_SALES_REBUILD_YEAR = 2026;
const MANUAL_SALES_REBUILD_MONTH = 3;

function RUN_01_startRefreshLoop() {
  const result = startRefreshLoop();
  Logger.log('RUN_01_startRefreshLoop -> %s', JSON.stringify(result));
  return result;
}

function RUN_02_stopRefreshLoop() {
  return stopRefreshLoop();
}

function RUN_03_getRefreshLoopState() {
  const result = getRefreshLoopState();
  Logger.log('RUN_03_getRefreshLoopState -> %s', JSON.stringify(result));
  return result;
}

function RUN_04_resetRefreshLoopState() {
  return resetRefreshLoopState();
}

function RUN_05_schedulerTickNow() {
  const result = schedulerTick_();
  Logger.log('RUN_05_schedulerTickNow -> %s', JSON.stringify(result));
  return result;
}

function RUN_06_monthlyRepairNow() {
  return monthlyRepairNow();
}

function RUN_07_refreshClientTagMapPart1Now() {
  return refreshClientTagMapPart1Now();
}

function RUN_08_refreshClientTagMapPart2Now() {
  return refreshClientTagMapPart2Now();
}

function RUN_09_refreshClientBalancesNow() {
  return refreshClientBalancesNow();
}

function RUN_10_refreshProductStockNow() {
  return refreshProductStockNow();
}

function RUN_11_refreshPreviousMonthNow() {
  return refreshPreviousMonthNow();
}

function RUN_12_fillSalesSelectedMonthNow() {
  return fillSalesSelectedMonthNow();
}

function RUN_13_fillSalesSelectedMonthAndRebuildCache() {
  return fillSalesSelectedMonthAndRebuildCache();
}

function RUN_14_deleteUnusedN8nAndDebugSheets() {
  return deleteUnusedN8nAndDebugSheets();
}

function RUN_15_setupDashboardSystem() {
  return setupDashboardSystem();
}

function RUN_16_hashTempPasswordsInAccessControl() {
  return hashTempPasswordsInAccessControl();
}

function RUN_17_ensureBrandListSheet() {
  return ensureBrandListSheet();
}

function RUN_18_setupClientAliasMapOnly() {
  const result = ensureClientAliasMapSheet();
  Logger.log('RUN_18_setupClientAliasMapOnly -> ' + JSON.stringify(result));
  return result;
}

function RUN_19_setupClientStatusMapOnly() {
  const result = ensureClientStatusMapSheet();
  Logger.log('RUN_19_setupClientStatusMapOnly -> ' + JSON.stringify(result));
  return result;
}

function RUN_20_installRefreshLoopTrigger() {
  return installRefreshLoopTrigger();
}

function RUN_21_ensureClientBalancesSheet() {
  return ensureClientBalancesSheet();
}

function RUN_22_ensureProductStockSheet() {
  return ensureProductStockSheet();
}

function RUN_23_rebuildDashboardServerSnapshot() {
  return rebuildDashboardServerSnapshot();
}

function RUN_24_testCounterpartyBalanceAccess() {
  const result = testCounterpartyBalanceAccess();
  Logger.log('RUN_24_testCounterpartyBalanceAccess -> %s', JSON.stringify(result));
  return result;
}

function RUN_resetProjectStateSafe() {
  const result = resetProjectStateSafe();
  Logger.log('RUN_resetProjectStateSafe -> %s', JSON.stringify(result));
  return result;
}
// --------------------------------------------------
// CONFIG / PROPERTIES
// --------------------------------------------------

function getScriptPropertyOrThrow(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value || !String(value).trim()) {
    throw new Error('Не задано Script Property: ' + name);
  }
  return String(value).trim();
}

function getMoySkladToken() {
  return getScriptPropertyOrThrow('MOYSKLAD_TOKEN');
}

function getApiBase() {
  return getScriptPropertyOrThrow('MOYSKLAD_API_BASE');
}

const DEMAND_LIMIT = 25;
const PAYMENT_LIMIT = 50;
const COUNTERPARTY_LIMIT = 500;
const CLIENT_TAG_MAP_REFRESH_LIMIT = 50;
const CLIENT_TAG_MAP_MANUAL_PART_LIMIT = 500;
const CLIENT_TAG_MAP_REFRESH_EXECUTION_MS = 60 * 1000;
const MIN_DATE = '2024-01-01 00:00:00';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const DASHBOARD_DATA_CACHE_TTL_SECONDS = 90;
const ADMIN_BOOTSTRAP_CACHE_TTL_SECONDS = 60;
const REFRESH_LOOP_HANDLER = 'schedulerTick_';
const REFRESH_LOOP_META_PREFIX = 'refresh_loop_';
const REFRESH_LOOP_STALE_TASK_MS = 10 * 60 * 1000;
const REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY = 'refresh_loop_cycle_completed_at';
const REFRESH_LOOP_CYCLE_COUNTER_KEY = 'refresh_loop_cycle_counter';
const DASHBOARD_SNAPSHOT_VERSION = 1;
const DASHBOARD_SNAPSHOT_FILE_ID_META_KEY = 'dashboard_server_snapshot_file_id';
const DASHBOARD_SNAPSHOT_STATE_META_KEY = 'dashboard_server_snapshot_state';
const DASHBOARD_SNAPSHOT_BUILT_AT_META_KEY = 'dashboard_server_snapshot_built_at';
const DASHBOARD_SNAPSHOT_INVALIDATED_AT_META_KEY = 'dashboard_server_snapshot_invalidated_at';
const DASHBOARD_SNAPSHOT_LAST_ERROR_META_KEY = 'dashboard_server_snapshot_last_error';
const CLIENT_TAG_MAP_REFRESH_META_PREFIX = 'client_tag_map_refresh_';
const CLIENT_TAG_MAP_REFRESH_CONTINUATION_HANDLER = 'continueClientTagMapRefresh_';

// ===== SALES SHEETS =====
const SHEET_MAIN = 'sales_lines_test';
const SHEET_ARCHIVE = 'sales_archive';
const SHEET_CURRENT = 'sales_current_month';
const SHEET_SALES_YEAR_PREFIX = 'sales_';

// ===== PAYMENTS SHEETS =====
const SHEET_PAYMENTS_MAIN = 'payments_in';
const SHEET_PAYMENTS_ARCHIVE = 'payments_archive';
const SHEET_PAYMENTS_CURRENT = 'payments_current_month';

// ===== SERVICE SHEETS =====
const SHEET_ACCESS_CONTROL = 'access_control';
const SHEET_CLIENT_MANAGER_MAP = 'client_manager_map';
const SHEET_CLIENT_ALIAS_MAP = 'client_alias_map';
const SHEET_CLIENT_STATUS_MAP = 'client_status_map';
const SHEET_CLIENT_TAG_MAP = 'client_tag_map';
const SHEET_CLIENT_BALANCES = 'client_balances';
const SHEET_CLIENT_BALANCES_DEBUG = 'client_balances_debug';
const SHEET_CLIENT_BALANCES_ACCOUNTS_DEBUG = 'client_balances_accounts_debug';
const SHEET_PRODUCT_STOCK = 'product_stock';
const SHEET_CLIENT_TAG_RULES = 'client_tag_rules';
const SHEET_CLASSIFICATION_RULES = 'classification_rules';
const SHEET_MANAGER_CHANGE_SUGGESTIONS = 'manager_change_suggestions';
const SHEET_PRODUCT_MANUAL_MAP = 'product_manual_map';
const SHEET_SYSTEM_META = 'system_meta';
const SHEET_BRAND_LIST = 'brand_list';
const SHEET_OKR_PLANS = 'okr_plans';
const SHEET_BONUSES_LOG = 'bonuses_log';

// ===== SALES HEADERS =====
const HEADERS = [
  'month',
  'date',
  'order_id',
  'order_no',
  'client',
  'position_id',
  'sku',
  'product',
  'product_group',
  'brand',
  'quantity',
  'unit_price',
  'discount_pct',
  'revenue',
  'status'
];

// ===== PAYMENTS HEADERS =====
const PAYMENT_HEADERS = [
  'month',
  'date',
  'payment_id',
  'payment_no',
  'client',
  'manager',
  'amount',
  'description',
  'organization',
  'agent_sync_id'
];

// ===== SERVICE HEADERS =====
const ACCESS_CONTROL_HEADERS = [
  'email',
  'role',
  'display_name',
  'manager_tag',
  'active',
  'password_hash',
  'temp_password'
];

const CLIENT_MANAGER_MAP_HEADERS = [
  'client',
  'effective_manager',
  'updated_by',
  'updated_at',
  'active'
];

const CLIENT_ALIAS_MAP_HEADERS = [
  'source_client',
  'target_client',
  'updated_by',
  'updated_at',
  'active'
];

const CLIENT_STATUS_MAP_HEADERS = [
  'client',
  'status',
  'updated_by',
  'updated_at',
  'active'
];

const CLIENT_TAG_MAP_HEADERS = [
  'counterparty_id',
  'client',
  'manager_tag',
  'exclude_tags',
  'all_tags',
  'updated_at'
];

const CLIENT_BALANCES_HEADERS = [
  'counterparty_id',
  'client',
  'balance',
  'manager_tag',
  'exclude_tags',
  'all_tags',
  'updated_at',
  'defer_days'
];

const PRODUCT_STOCK_HEADERS = [
  'assortment_id',
  'meta_href',
  'sku',
  'product',
  'brand',
  'category',
  'product_group',
  'stock',
  'reserve',
  'in_transit',
  'available_qty',
  'uom',
  'updated_at'
];

const CLIENT_BALANCES_DEBUG_HEADERS = [
  'counterparty_id',
  'client',
  'accountsReceivable',
  'accountsPayable',
  'balance',
  'debt',
  'state_balance',
  'agent_balance',
  'accounts_json',
  'attributes_json',
  'updated_at'
];

const CLIENT_BALANCES_ACCOUNTS_DEBUG_HEADERS = [
  'counterparty_id',
  'client',
  'account_index',
  'account_meta_href',
  'account_id',
  'account_name',
  'balance',
  'sum',
  'accountsReceivable',
  'accountsPayable',
  'available',
  'credit',
  'debit',
  'raw_json',
  'updated_at'
];

const CLIENT_TAG_RULES_HEADERS = [
  'tag_name',
  'tag_role',
  'active',
  'note'
];

const SYSTEM_META_HEADERS = [
  'key',
  'value',
  'updated_at'
];

const BRAND_LIST_HEADERS = [
  'brand',
  'active',
  'updated_at',
  'updated_by'
];

const CLASSIFICATION_RULES_HEADERS = [
  'rule_type',
  'match_field',
  'match_type',
  'pattern',
  'result_value',
  'priority',
  'active',
  'updated_by',
  'updated_at'
];

const MANAGER_CHANGE_SUGGESTIONS_HEADERS = [
  'client',
  'old_manager',
  'new_manager',
  'detected_at',
  'status',
  'comment'
];

const PRODUCT_MANUAL_MAP_HEADERS = [
  'sku',
  'product',
  'brand',
  'category',
  'product_group',
  'updated_by',
  'updated_at',
  'active'
];

const OKR_PLAN_HEADERS = [
  'month_key',
  'manager_tag',
  'plan_month',
  'plan_quarter',
  'plan_year',
  'kr1_reduce_pct',
  'kr2_return_count',
  'updated_by',
  'updated_at'
];

const BONUSES_LOG_HEADERS = [
  'event_id',
  'event_date',
  'client',
  'manager_tag',
  'category',
  'kind',
  'title',
  'note',
  'value',
  'currency',
  'source',
  'updated_by',
  'updated_at',
  'active'
];

// --------------------------------------------------
// HTML APP
// --------------------------------------------------

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Sales Dashboard System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --------------------------------------------------
// SETUP
// --------------------------------------------------

function setupDashboardSystem() {
  const ss = getSpreadsheet();
  const report = [];

  report.push(ensureSystemSheet(ss, SHEET_ACCESS_CONTROL, ACCESS_CONTROL_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_CLIENT_MANAGER_MAP, CLIENT_MANAGER_MAP_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_CLIENT_ALIAS_MAP, CLIENT_ALIAS_MAP_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_CLIENT_STATUS_MAP, CLIENT_STATUS_MAP_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_CLASSIFICATION_RULES, CLASSIFICATION_RULES_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_MANAGER_CHANGE_SUGGESTIONS, MANAGER_CHANGE_SUGGESTIONS_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_PRODUCT_MANUAL_MAP, PRODUCT_MANUAL_MAP_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_SYSTEM_META, SYSTEM_META_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_BRAND_LIST, BRAND_LIST_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_OKR_PLANS, OKR_PLAN_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_BONUSES_LOG, BONUSES_LOG_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_CLIENT_BALANCES, CLIENT_BALANCES_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_CLIENT_BALANCES_DEBUG, CLIENT_BALANCES_DEBUG_HEADERS));
  report.push(ensureSystemSheet(ss, SHEET_CLIENT_BALANCES_ACCOUNTS_DEBUG, CLIENT_BALANCES_ACCOUNTS_DEBUG_HEADERS));

  Logger.log('setupDashboardSystem -> ' + JSON.stringify(report, null, 2));
}

function ensureClientAliasMapSheet() {
  return ensureSystemSheet(getSpreadsheet(), SHEET_CLIENT_ALIAS_MAP, CLIENT_ALIAS_MAP_HEADERS);
}


function ensureClientStatusMapSheet() {
  return ensureSystemSheet(getSpreadsheet(), SHEET_CLIENT_STATUS_MAP, CLIENT_STATUS_MAP_HEADERS);
}


function ensureSystemSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  let status = 'exists';

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    status = 'created';
  }

  ensureExactHeaders(sheet, headers);
  formatSystemSheet(sheet, headers.length);
  applySpecialSheetFormats(sheet);

  return { sheet: sheetName, status: status };
}

function ensureExactHeaders(sheet, headers) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(function(v) {
    return String(v || '').trim();
  });

  const expected = headers.map(function(v) {
    return String(v || '').trim();
  });

  let same = true;
  for (var i = 0; i < expected.length; i++) {
    if (currentHeaders[i] !== expected[i]) {
      same = false;
      break;
    }
  }

  if (!same) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function formatSystemSheet(sheet, columnCount) {
  sheet.setFrozenRows(1);
  const headerRange = sheet.getRange(1, 1, 1, columnCount);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#eaf2ff');
  headerRange.setHorizontalAlignment('center');
  sheet.autoResizeColumns(1, columnCount);
}

function applySpecialSheetFormats(sheet) {
  if (!sheet) return;
  const sheetName = sheet.getName();

  if (
    sheetName === SHEET_MAIN ||
    sheetName === SHEET_ARCHIVE ||
    sheetName === SHEET_CURRENT
  ) {
    sheet.getRange('G:G').setNumberFormat('@');
  }

  if (sheetName === SHEET_PRODUCT_STOCK) {
    sheet.getRange('C:C').setNumberFormat('@');
  }

  if (sheetName === SHEET_PRODUCT_MANUAL_MAP) {
    sheet.getRange('A:A').setNumberFormat('@');
  }
}

function ensureSystemMetaSheet() {
  const ss = getSpreadsheet();
  return ensureSystemSheet(ss, SHEET_SYSTEM_META, SYSTEM_META_HEADERS);
}

function setSystemMetaValue(key, value) {
  ensureSystemMetaSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_SYSTEM_META);
  ensureHeadersForSheet(sheet, SYSTEM_META_HEADERS);

  const cleanKey = normalizeCell(key);
  const cleanValue = normalizeCell(value);
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const values = sheet.getDataRange().getValues();
  let rowIndex = 0;

  for (var i = 1; i < values.length; i++) {
    if (normalizeCell(values[i][0]) === cleanKey) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex) {
    sheet.getRange(rowIndex, 1, 1, 3).setValues([[cleanKey, cleanValue, now]]);
  } else {
    sheet.appendRow([cleanKey, cleanValue, now]);
  }
}

function getSystemMetaValue(key) {
  ensureSystemMetaSheet();
  const rows = getSheetObjects(SHEET_SYSTEM_META);
  const cleanKey = normalizeCell(key);
  const row = rows.find(function(item) {
    return normalizeCell(item.key) === cleanKey;
  });
  return row ? normalizeCell(row.value) : '';
}

function setSalesLastRefreshNow() {
  const formatted = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss dd.MM.yyyy');
  setSystemMetaValue('sales_last_refresh', formatted);
}

function ensureBrandListSheet() {
  const ss = getSpreadsheet();
  ensureSystemSheet(ss, SHEET_BRAND_LIST, BRAND_LIST_HEADERS);
  syncBrandListSheetWithBrands(getAllBrandsForBrandListSync_(), 'system');
  return { sheet: SHEET_BRAND_LIST, status: 'ready' };
}

function getBrandListRows() {
  ensureSystemSheet(getSpreadsheet(), SHEET_BRAND_LIST, BRAND_LIST_HEADERS);

  return getSheetObjects(SHEET_BRAND_LIST)
    .map(function(row) {
      return {
        brand: normalizeCell(row.brand),
        active: normalizeActiveFlag(row.active, true),
        updated_at: normalizeCell(row.updated_at),
        updated_by: normalizeCell(row.updated_by)
      };
    })
    .filter(function(row) {
      return row.brand;
    });
}

function ensureOkrPlansSheet() {
  const result = ensureSystemSheet(getSpreadsheet(), SHEET_OKR_PLANS, OKR_PLAN_HEADERS);
  const sheet = getSpreadsheet().getSheetByName(SHEET_OKR_PLANS);
  if (sheet) {
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.getRange('B:B').setNumberFormat('@');
    sheet.getRange('C:G').setNumberFormat('0.00');
    sheet.getRange('H:I').setNumberFormat('@');
  }
  return result;
}

function getOkrPlanSheetRowsByPosition_() {
  ensureOkrPlansSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_OKR_PLANS);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  return values.slice(1).map(function(row) {
    return {
      month_key: normalizeCell(row[0]),
      manager_tag: normalizeCell(row[1]),
      plan_month: Number(row[2]) || 0,
      plan_quarter: Number(row[3]) || 0,
      plan_year: Number(row[4]) || 0,
      kr1_reduce_pct: Number(row[5]) || 0,
      kr2_return_count: Number(row[6]) || 0,
      updated_by: normalizeCell(row[7]),
      updated_at: normalizeCell(row[8])
    };
  }).filter(function(row) {
    return row.month_key || row.manager_tag;
  });
}

function getOkrDefaultManagerTags_() {
  const rawValue = getSystemMetaValue('okr_default_manager_tags');
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.map(normalizeCell).filter(Boolean)
      : [];
  } catch (err) {
    return [];
  }
}

function setOkrDefaultManagerTags_(tags) {
  const cleanTags = Array.isArray(tags)
    ? tags.map(normalizeCell).filter(Boolean)
    : [];
  setSystemMetaValue('okr_default_manager_tags', JSON.stringify(cleanTags));
  return cleanTags;
}

function getOkrPlanRows_(monthKey) {
  const cleanMonthKey = normalizeCell(monthKey);
  if (!cleanMonthKey) return [];

  return getOkrPlanSheetRowsByPosition_()
    .filter(function(row) {
      return row.month_key === cleanMonthKey;
    })
    .filter(function(row) {
      return row.manager_tag;
    })
    .sort(function(a, b) {
      return a.manager_tag.localeCompare(b.manager_tag, 'uk');
    });
}


function ensureBonusesLogSheet() {
  const result = ensureSystemSheet(getSpreadsheet(), SHEET_BONUSES_LOG, BONUSES_LOG_HEADERS);
  const sheet = getSpreadsheet().getSheetByName(SHEET_BONUSES_LOG);
  if (sheet) {
    sheet.getRange('A:H').setNumberFormat('@');
    sheet.getRange('I:I').setNumberFormat('0.00');
    sheet.getRange('J:N').setNumberFormat('@');
  }
  return result;
}

function getBonusesLogRowsForAdmin_() {
  ensureBonusesLogSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_BONUSES_LOG);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  return values.slice(1).map(function(row) {
    return {
      event_id: normalizeCell(row[0]),
      event_date: normalizeCell(row[1]),
      client: normalizeCell(row[2]),
      manager_tag: normalizeCell(row[3]),
      category: normalizeCell(row[4]),
      kind: normalizeCell(row[5]),
      title: normalizeCell(row[6]),
      note: normalizeCell(row[7]),
      value: Number(row[8]) || 0,
      currency: normalizeCell(row[9]),
      source: normalizeCell(row[10]),
      updated_by: normalizeCell(row[11]),
      updated_at: normalizeCell(row[12]),
      active: normalizeActiveFlag(row[13], true)
    };
  }).filter(function(row) {
    return row.event_id && row.active !== false;
  });
}

function serverUpsertBonusLogEvents(sessionToken, events) {
  const user = requireAuthorizedUserBySession(sessionToken);
  ensureBonusesLogSheet();

  const sheet = getSpreadsheet().getSheetByName(SHEET_BONUSES_LOG);
  ensureExactHeaders(sheet, BONUSES_LOG_HEADERS);

  const input = Array.isArray(events) ? events : [];
  if (!input.length) {
    return { ok: true, created: 0, existing: 0, bonuses_log: getBonusesLogRowsForAdmin_() };
  }

  const values = sheet.getDataRange().getValues();
  const existingIds = {};
  for (var i = 1; i < values.length; i++) {
    const id = normalizeCell(values[i][0]);
    if (id) existingIds[id] = true;
  }

  const now = nowText();
  const rowsToAppend = [];
  let existing = 0;

  input.forEach(function(event) {
    const eventId = normalizeCell(event && event.event_id);
    const eventDate = normalizeCell(event && event.event_date);
    const client = normalizeCell(event && event.client);
    const managerTag = normalizeCell(event && event.manager_tag);
    const category = normalizeCell(event && event.category);
    const kind = normalizeCell(event && event.kind);
    const title = normalizeCell(event && event.title);
    const note = normalizeCell(event && event.note);
    const value = Number(event && event.value) || 0;
    const currency = normalizeCell(event && event.currency);
    const source = normalizeCell(event && event.source) || 'dashboard';

    if (!eventId || !eventDate || !client || !category || !kind || !title || !value || !currency) return;
    if (existingIds[eventId]) {
      existing++;
      return;
    }

    rowsToAppend.push([
      eventId,
      eventDate,
      client,
      managerTag,
      category,
      kind,
      title,
      note,
      value,
      currency,
      source,
      user.email || 'system',
      now,
      true
    ]);
    existingIds[eventId] = true;
  });

  if (rowsToAppend.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, BONUSES_LOG_HEADERS.length).setValues(rowsToAppend);
    markDashboardServerSnapshotStale_('bonuses_log_changed');
  }

  return {
    ok: true,
    created: rowsToAppend.length,
    existing: existing,
    bonuses_log: getBonusesLogRowsForAdmin_()
  };
}

function saveOkrPlanRows_(monthKey, rows, updatedBy) {
  ensureOkrPlansSheet();
  const cleanMonthKey = normalizeCell(monthKey);
  const sheet = getSpreadsheet().getSheetByName(SHEET_OKR_PLANS);
  ensureExactHeaders(sheet, OKR_PLAN_HEADERS);

  const nextRows = Array.isArray(rows) ? rows : [];
  const existing = getOkrPlanSheetRowsByPosition_()
    .map(function(row) {
      return [
        row.month_key,
        row.manager_tag,
        row.plan_month,
        row.plan_quarter,
        row.plan_year,
        row.kr1_reduce_pct,
        row.kr2_return_count,
        row.updated_by,
        row.updated_at
      ];
    })
    .filter(function(row) {
      return row[0] && row[0] !== cleanMonthKey;
    });

  const timestamp = nowText();
  const appended = nextRows
    .map(function(row) {
      return {
        month_key: cleanMonthKey,
        manager_tag: normalizeCell(row.manager_tag),
        plan_month: Number(row.plan_month) || 0,
        plan_quarter: Number(row.plan_quarter) || 0,
        plan_year: Number(row.plan_year) || 0,
        kr1_reduce_pct: Number(row.kr1_reduce_pct) || 0,
        kr2_return_count: Number(row.kr2_return_count) || 0
      };
    })
    .filter(function(row) {
      return row.manager_tag;
    })
    .map(function(row) {
      return [
        row.month_key,
        row.manager_tag,
        row.plan_month,
        row.plan_quarter,
        row.plan_year,
        row.kr1_reduce_pct,
        row.kr2_return_count,
        normalizeCell(updatedBy),
        timestamp
      ];
    });

  const output = existing.concat(appended);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, OKR_PLAN_HEADERS.length).clearContent();
  }
  if (output.length) {
    sheet.getRange(2, 1, output.length, OKR_PLAN_HEADERS.length).setValues(output);
  }
  return getOkrPlanRows_(cleanMonthKey);
}

function getAllBrandsForBrandListSync_() {
  let archive = sheetToObjects(SHEET_ARCHIVE);
  let current = sheetToObjects(SHEET_CURRENT);
  archive = enrichRowsWithManagerTag(archive);
  current = enrichRowsWithManagerTag(current);
  archive = applyProductManualMap(archive);
  current = applyProductManualMap(current);
  return collectProductOptionsForAdmin(archive.concat(current)).brands;
}

function syncBrandListSheetWithBrands(brands, updatedBy) {
  ensureSystemSheet(getSpreadsheet(), SHEET_BRAND_LIST, BRAND_LIST_HEADERS);
  const sheet = getSpreadsheet().getSheetByName(SHEET_BRAND_LIST);
  ensureHeadersForSheet(sheet, BRAND_LIST_HEADERS);

  const normalizedBrands = (Array.isArray(brands) ? brands : [])
    .map(normalizeCell)
    .filter(Boolean)
    .sort(function(a, b) {
      return a.localeCompare(b, 'uk');
    });

  if (!normalizedBrands.length) return getBrandListRows();

  const existingRows = getBrandListRows();
  const existingMap = {};
  existingRows.forEach(function(row) {
    existingMap[row.brand] = row;
  });

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const actor = normalizeCell(updatedBy) || 'system';
  const rowsToAppend = [];

  normalizedBrands.forEach(function(brand) {
    if (!existingMap[brand]) {
      rowsToAppend.push([brand, 'TRUE', now, actor]);
    }
  });

  if (rowsToAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, BRAND_LIST_HEADERS.length).setValues(rowsToAppend);
  }

  return getBrandListRows();
}

function getBrandListStateMap() {
  const map = {};
  getBrandListRows().forEach(function(row) {
    map[row.brand] = row.active !== false;
  });
  return map;
}

function getBrandListStateMapFromRows(rows) {
  const map = {};
  (Array.isArray(rows) ? rows : []).forEach(function(row) {
    const brand = normalizeCell(row && row.brand);
    if (!brand) return;
    map[brand] = row.active !== false;
  });
  return map;
}

function applyBrandListFilterToRows(rows, stateMap) {
  const map = stateMap || getBrandListStateMap();
  return (Array.isArray(rows) ? rows : []).filter(function(row) {
    const brand = normalizeCell(row.brand);
    if (!brand) return true;
    if (!Object.prototype.hasOwnProperty.call(map, brand)) return true;
    return map[brand] !== false;
  });
}

// --------------------------------------------------
// PASSWORDS / ACCESS
// --------------------------------------------------

function sha256Hex(text) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function generatePasswordHashForSheet() {
  const rawPassword = 'CHANGE_ME';
  const hash = sha256Hex(rawPassword);
  Logger.log('PASSWORD HASH: ' + hash);
}

function hashTempPasswordsInAccessControl() {
  const sheet = getOrCreateSheet(SHEET_ACCESS_CONTROL);
  ensureHeadersForSheet(sheet, ACCESS_CONTROL_HEADERS);

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    Logger.log('Немає даних у access_control');
    return;
  }

  const headers = values[0].map(function(h) { return String(h || '').trim(); });

  const emailCol = headers.indexOf('email');
  const passwordHashCol = headers.indexOf('password_hash');
  const tempPasswordCol = headers.indexOf('temp_password');

  if (emailCol === -1) throw new Error('Не знайдено колонку email');
  if (passwordHashCol === -1) throw new Error('Не знайдено колонку password_hash');
  if (tempPasswordCol === -1) throw new Error('Не знайдено колонку temp_password');

  let updatedCount = 0;

  for (let i = 1; i < values.length; i++) {
    const email = String(values[i][emailCol] || '').trim().toLowerCase();
    const tempPassword = String(values[i][tempPasswordCol] || '').trim();

    if (!email || !tempPassword) continue;

    const hash = sha256Hex(tempPassword);
    values[i][passwordHashCol] = hash;
    values[i][tempPasswordCol] = '';
    updatedCount++;
  }

  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  Logger.log('Оновлено паролів: ' + updatedCount);
}

function savePasswordHashByEmail(email, hash) {
  const cleanEmail = normalizeCell(email).toLowerCase();
  if (!cleanEmail || !hash) return false;

  const sheet = getOrCreateSheet(SHEET_ACCESS_CONTROL);
  ensureHeadersForSheet(sheet, ACCESS_CONTROL_HEADERS);

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return false;

  const headers = values[0].map(function(h) { return String(h || '').trim(); });
  const emailCol = headers.indexOf('email');
  const passwordHashCol = headers.indexOf('password_hash');
  const tempPasswordCol = headers.indexOf('temp_password');

  for (let i = 1; i < values.length; i++) {
    const rowEmail = String(values[i][emailCol] || '').trim().toLowerCase();
    if (rowEmail === cleanEmail) {
      values[i][passwordHashCol] = hash;
      values[i][tempPasswordCol] = '';
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
      return true;
    }
  }

  return false;
}

function getActiveAccessRows() {
  return getSheetObjects(SHEET_ACCESS_CONTROL).filter(function(row) {
    return isTruthyCell(row.active) && normalizeCell(row.email);
  });
}

function getUserAccessByEmail(email) {
  const cleanEmail = normalizeCell(email).toLowerCase();
  if (!cleanEmail) return null;

  const rows = getActiveAccessRows();
  for (var i = 0; i < rows.length; i++) {
    const rowEmail = normalizeCell(rows[i].email).toLowerCase();
    if (rowEmail === cleanEmail) {
      var rawManagerTag = normalizeCell(rows[i].manager_tag);
      var rawActive = rows[i].active;
      var rawPasswordHash = normalizeCell(rows[i].password_hash);
      var rawTempPassword = normalizeCell(rows[i].temp_password);

      // Tolerate partially shifted access_control rows after inserting manager_tag.
      if (isTruthyCell(rawManagerTag) && !isTruthyCell(rawActive) && rawPasswordHash === '' && rawTempPassword === '') {
        rawManagerTag = '';
        rawActive = rows[i].manager_tag;
        rawPasswordHash = normalizeCell(rows[i].active);
      }

      return {
        email: rowEmail,
        role: normalizeCell(rows[i].role),
        display_name: normalizeCell(rows[i].display_name),
        manager_tag: normalizeTagName(rawManagerTag),
        active: isTruthyCell(rawActive),
        password_hash: rawPasswordHash,
        temp_password: rawTempPassword
      };
    }
  }

  return null;
}

// --------------------------------------------------
// SESSIONS
// --------------------------------------------------

function createSessionTokenForUser(email) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const payload = {
    email: normalizeCell(email).toLowerCase(),
    created_at: nowText()
  };

  CacheService.getScriptCache().put('sess:' + token, JSON.stringify(payload), SESSION_TTL_SECONDS);
  return token;
}

function readSessionByToken(sessionToken) {
  const clean = normalizeCell(sessionToken);
  if (!clean) return null;

  const raw = CacheService.getScriptCache().get('sess:' + clean);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function invalidateSessionToken(sessionToken) {
  const clean = normalizeCell(sessionToken);
  if (!clean) return;
  CacheService.getScriptCache().remove('sess:' + clean);
}

function requireAuthorizedUserBySession(sessionToken) {
  const session = readSessionByToken(sessionToken);
  if (!session || !session.email) {
    throw new Error('Сесія не знайдена або протермінована');
  }

  const access = getUserAccessByEmail(session.email);
  if (!access || !access.active) {
    throw new Error('Доступ відкликано');
  }

  return {
    email: access.email,
    role: access.role,
    display_name: access.display_name,
    manager_tag: access.manager_tag,
    is_admin: access.role === 'admin' || access.role === 'head',
    is_manager: access.role === 'manager',
    authorized: true
  };
}

function requireAdminBySession(sessionToken) {
  const user = requireAuthorizedUserBySession(sessionToken);
  if (!user.is_admin) throw new Error('Недостатньо прав доступу');
  return user;
}

// --------------------------------------------------
// HTML SERVICE SERVER METHODS
// --------------------------------------------------

function serverLogin(email, password) {
  const cleanEmail = normalizeCell(email).toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanEmail) throw new Error('Вкажи email');
  if (!cleanPassword) throw new Error('Вкажи пароль');

  const user = getUserAccessByEmail(cleanEmail);
  if (!user || !user.active) {
    throw new Error('Користувача не знайдено або доступ вимкнено');
  }

  const inputHash = sha256Hex(cleanPassword);

  if (user.password_hash) {
    if (inputHash !== user.password_hash) {
      throw new Error('Невірний email або пароль');
    }

    const sessionToken = createSessionTokenForUser(cleanEmail);
    return {
      ok: true,
      session_token: sessionToken,
      user: {
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        manager_tag: user.manager_tag,
        is_admin: user.role === 'admin' || user.role === 'head',
        is_manager: user.role === 'manager'
      }
    };
  }

  if (user.temp_password) {
    if (cleanPassword !== user.temp_password) {
      throw new Error('Невірний email або пароль');
    }

    savePasswordHashByEmail(cleanEmail, inputHash);

    const sessionToken = createSessionTokenForUser(cleanEmail);
    return {
      ok: true,
      session_token: sessionToken,
      user: {
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        manager_tag: user.manager_tag,
        is_admin: user.role === 'admin' || user.role === 'head',
        is_manager: user.role === 'manager'
      }
    };
  }

  throw new Error('Для користувача не задано пароль. Звернись до адміністратора');
}

function serverLogout(sessionToken) {
  invalidateSessionToken(sessionToken);
  return { ok: true };
}

function normalizeClientBalanceRow(row) {
  return {
    counterparty_id: normalizeCell(row.counterparty_id),
    client: normalizeCell(row.client),
    balance: round2(Number(row.balance || 0)),
    updated_at: normalizeCell(row.updated_at),
    manager_tag: normalizeTagName(row.manager_tag),
    client_exclude_tags: normalizeCell(row.exclude_tags || row.client_exclude_tags),
    client_all_tags: normalizeCell(row.all_tags || row.client_all_tags),
    defer_days: normalizeCell(row.defer_days),
    original_client: normalizeCell(row.original_client)
  };
}

function getClientBalanceRowsForDashboard(user, prefetchedRows) {
  let rows = Array.isArray(prefetchedRows) ? prefetchedRows.slice() : getSheetObjects(SHEET_CLIENT_BALANCES);
  rows = enrichRowsWithManagerTag(rows);
  rows = applyClientAliasMap(rows);
  rows = filterRowsForUser(rows, user);
  return rows.map(normalizeClientBalanceRow).filter(function(row) {
    return row.client;
  });
}

function getClientManagerMapRowsForAdmin_() {
  return getSheetObjects(SHEET_CLIENT_MANAGER_MAP)
    .map(function(row, index) {
      return {
        row_number: index + 2,
        client: normalizeCell(row.client),
        effective_manager: normalizeCell(row.effective_manager),
        updated_by: normalizeCell(row.updated_by),
        updated_at: normalizeCell(row.updated_at),
        active: isTruthyCell(row.active)
      };
    })
    .filter(function(row) {
      return row.client;
    });
}

function getClientAliasMapRowsForAdmin_() {
  return getSheetObjects(SHEET_CLIENT_ALIAS_MAP)
    .map(function(row, index) {
      return {
        row_number: index + 2,
        source_client: normalizeCell(row.source_client),
        target_client: normalizeCell(row.target_client),
        updated_by: normalizeCell(row.updated_by),
        updated_at: normalizeCell(row.updated_at),
        active: isTruthyCell(row.active)
      };
    })
    .filter(function(row) {
      return row.source_client;
    });
}

function getClientStatusMapRowsForAdmin_() {
  ensureClientStatusMapSheet();
  return getSheetObjects(SHEET_CLIENT_STATUS_MAP)
    .map(function(row, index) {
      return {
        row_number: index + 2,
        client: normalizeCell(row.client),
        status: normalizeCell(row.status).toLowerCase(),
        updated_by: normalizeCell(row.updated_by),
        updated_at: normalizeCell(row.updated_at),
        active: isTruthyCell(row.active)
      };
    })
    .filter(function(row) {
      return row.client;
    });
}

function getClientTagMapRowsForAdmin_() {
  return getSheetObjects(SHEET_CLIENT_TAG_MAP)
    .map(function(row, index) {
      return {
        row_number: index + 2,
        counterparty_id: normalizeCell(row.counterparty_id),
        client: normalizeCell(row.client),
        manager_tag: normalizeTagName(row.manager_tag),
        exclude_tags: normalizeCell(row.exclude_tags),
        all_tags: normalizeCell(row.all_tags),
        updated_at: normalizeCell(row.updated_at)
      };
    })
    .filter(function(row) {
      return row.client;
    });
}

function getProductManualMapRowsForAdmin_() {
  return getProductManualMapRows().map(function(row, index) {
    return {
      row_number: index + 2,
      sku: normalizeCell(row.sku),
      product: normalizeCell(row.product),
      brand: normalizeCell(row.brand),
      category: normalizeCell(row.category),
      product_group: normalizeCell(row.product_group),
      updated_by: normalizeCell(row.updated_by),
      updated_at: normalizeCell(row.updated_at),
      active: isTruthyCell(row.active)
    };
  }).filter(function(row) {
    return row.product || row.sku;
  });
}

function getProductStockRowsForAdmin_() {
  return getSheetObjects(SHEET_PRODUCT_STOCK)
    .map(function(row, index) {
      return {
        row_number: index + 2,
        assortment_id: normalizeCell(row.assortment_id),
        meta_href: normalizeCell(row.meta_href),
        sku: normalizeCell(row.sku),
        product: normalizeCell(row.product),
        brand: normalizeCell(row.brand),
        category: normalizeCell(row.category),
        product_group: normalizeCell(row.product_group),
        stock: Number(row.stock || 0),
        reserve: Number(row.reserve || 0),
        in_transit: Number(row.in_transit || 0),
        available_qty: Number(row.available_qty || 0),
        uom: normalizeCell(row.uom),
        updated_at: normalizeCell(row.updated_at)
      };
    })
    .filter(function(row) {
      return row.product || row.sku || row.assortment_id;
    });
}

function getDashboardSnapshotFileName_() {
  return 'sales_dashboard_server_snapshot_' + getSpreadsheet().getId() + '.json.gz';
}

function getDashboardSnapshotParentFolder_() {
  const spreadsheetId = getSpreadsheet().getId();

  try {
    const spreadsheetFile = DriveApp.getFileById(spreadsheetId);
    const parents = spreadsheetFile.getParents();
    if (parents.hasNext()) return parents.next();
  } catch (e) {}

  return null;
}

function getOrCreateDashboardSnapshotFile_() {
  const storedFileId = normalizeCell(getSystemMetaValue(DASHBOARD_SNAPSHOT_FILE_ID_META_KEY));
  if (storedFileId) {
    try {
      return DriveApp.getFileById(storedFileId);
    } catch (e) {}
  }

  const fileName = getDashboardSnapshotFileName_();
  const parentFolder = getDashboardSnapshotParentFolder_();

  const file = parentFolder
    ? parentFolder.createFile(fileName, '', MimeType.PLAIN_TEXT)
    : DriveApp.createFile(fileName, '', MimeType.PLAIN_TEXT);

  setSystemMetaValue(DASHBOARD_SNAPSHOT_FILE_ID_META_KEY, file.getId());
  return file;
}

function markDashboardServerSnapshotStale_(reason) {
  ensureSystemMetaSheet();
  setSystemMetaValue(DASHBOARD_SNAPSHOT_STATE_META_KEY, 'stale');
  setSystemMetaValue(DASHBOARD_SNAPSHOT_INVALIDATED_AT_META_KEY, nowText());
  setSystemMetaValue(DASHBOARD_SNAPSHOT_LAST_ERROR_META_KEY, normalizeCell(reason));
}

function markDashboardServerSnapshotFresh_(builtAt) {
  ensureSystemMetaSheet();
  setSystemMetaValue(DASHBOARD_SNAPSHOT_STATE_META_KEY, 'fresh');
  setSystemMetaValue(DASHBOARD_SNAPSHOT_BUILT_AT_META_KEY, normalizeCell(builtAt));
  setSystemMetaValue(DASHBOARD_SNAPSHOT_LAST_ERROR_META_KEY, '');
}

function readDashboardServerSnapshot_() {
  try {
    const file = getOrCreateDashboardSnapshotFile_();
    let blob = file.getBlob();
    const fileName = normalizeCell(file.getName()).toLowerCase();
    const contentType = normalizeCell(blob.getContentType()).toLowerCase();

    if (fileName.slice(-3) === '.gz' || contentType.indexOf('gzip') >= 0) {
      blob = Utilities.ungzip(blob);
    }

    const raw = String(blob.getDataAsString() || '').trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Number(parsed.snapshot_version) !== DASHBOARD_SNAPSHOT_VERSION) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeDashboardServerSnapshot_(snapshot) {
  const oldFileId = normalizeCell(getSystemMetaValue(DASHBOARD_SNAPSHOT_FILE_ID_META_KEY));
  const fileName = getDashboardSnapshotFileName_();
  const jsonBlob = Utilities.newBlob(JSON.stringify(snapshot), 'application/json', fileName.replace(/\.gz$/i, ''));
  const gzipBlob = Utilities.gzip(jsonBlob, fileName);
  const parentFolder = getDashboardSnapshotParentFolder_();

  const file = parentFolder
    ? parentFolder.createFile(gzipBlob)
    : DriveApp.createFile(gzipBlob);

  setSystemMetaValue(DASHBOARD_SNAPSHOT_FILE_ID_META_KEY, file.getId());

  if (oldFileId && oldFileId !== file.getId()) {
    try {
      DriveApp.getFileById(oldFileId).setTrashed(true);
    } catch (e) {}
  }
}

function buildDashboardServerSnapshotPayload_() {
  let archive = sheetToObjects(SHEET_ARCHIVE);
  let current = sheetToObjects(SHEET_CURRENT);
  let balances = getSheetObjects(SHEET_CLIENT_BALANCES);

  archive = enrichRowsWithManagerTag(archive);
  current = enrichRowsWithManagerTag(current);
  archive = applyProductManualMap(archive);
  current = applyProductManualMap(current);
  archive = applyClientAliasMap(archive);
  current = applyClientAliasMap(current);

  balances = enrichRowsWithManagerTag(balances);
  balances = applyClientAliasMap(balances);

  const adminBrandsSource = archive.concat(current);
  const sourceProductOptions = collectProductOptionsForAdmin(adminBrandsSource);
  const brandListRows = syncBrandListSheetWithBrands(sourceProductOptions.brands, 'snapshot');

  return {
    snapshot_version: DASHBOARD_SNAPSHOT_VERSION,
    built_at: nowText(),
    archive_all: archive,
    current_all: current,
    balances_all: balances,
    meta: {
      sales_last_refresh: getSystemMetaValue('sales_last_refresh'),
      client_tag_map_last_refresh: getSystemMetaValue('client_tag_map_last_refresh'),
      client_balances_last_refresh: getSystemMetaValue('client_balances_last_refresh'),
      product_stock_last_refresh: getSystemMetaValue('product_stock_last_refresh')
    },
    admin: {
      client_manager_map: getClientManagerMapRowsForAdmin_(),
      client_alias_map: getClientAliasMapRowsForAdmin_(),
      client_status_map: getClientStatusMapRowsForAdmin_(),
      bonuses_log: getBonusesLogRowsForAdmin_(),
      client_tag_map: getClientTagMapRowsForAdmin_(),
      product_manual_map: getProductManualMapRowsForAdmin_(),
      product_stock: getProductStockRowsForAdmin_(),
      product_options_all: sourceProductOptions,
      technical_tags_master: getTechnicalTagsMasterForDashboard(),
      brand_settings: {
        brands: brandListRows
      }
    }
  };
}

function rebuildDashboardServerSnapshotCore_() {
  const snapshot = buildDashboardServerSnapshotPayload_();
  writeDashboardServerSnapshot_(snapshot);
  markDashboardServerSnapshotFresh_(snapshot.built_at);

  return {
    ok: true,
    built_at: snapshot.built_at,
    archive_rows: snapshot.archive_all.length,
    current_rows: snapshot.current_all.length,
    balance_rows: snapshot.balances_all.length,
    product_stock_rows: snapshot.admin.product_stock.length
  };
}

function rebuildDashboardServerSnapshot() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    return rebuildDashboardServerSnapshotCore_();
  } catch (err) {
    markDashboardServerSnapshotStale_(err && err.message ? err.message : err);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function rebuildDashboardServerSnapshotInsideLockedFlow_() {
  try {
    return rebuildDashboardServerSnapshotCore_();
  } catch (err) {
    markDashboardServerSnapshotStale_(err && err.message ? err.message : err);
    throw err;
  }
}

function getDashboardServerSnapshot_() {
  const state = normalizeCell(getSystemMetaValue(DASHBOARD_SNAPSHOT_STATE_META_KEY)).toLowerCase();
  const snapshot = readDashboardServerSnapshot_();
  if (state === 'fresh' && snapshot) return snapshot;

  const lock = LockService.getScriptLock();
  if (lock.tryLock(500)) {
    try {
      rebuildDashboardServerSnapshotInsideLockedFlow_();
    } finally {
      lock.releaseLock();
    }

    const rebuiltSnapshot = readDashboardServerSnapshot_();
    if (rebuiltSnapshot) {
      return rebuiltSnapshot;
    }
  }

  if (snapshot) {
    return snapshot;
  }

  rebuildDashboardServerSnapshot();
  const rebuiltSnapshot = readDashboardServerSnapshot_();
  if (!rebuiltSnapshot) {
    throw new Error('Не вдалося прочитати dashboard snapshot після rebuild');
  }
  return rebuiltSnapshot;
}

function getDashboardServerSnapshotFresh_() {
  rebuildDashboardServerSnapshot();
  const snapshot = readDashboardServerSnapshot_();
  if (!snapshot) {
    throw new Error('Не вдалося отримати свіжий dashboard snapshot');
  }
  return snapshot;
}

function getPreparedDashboardDataForUserFromSnapshot_(user, snapshot) {
  const safeSnapshot = snapshot || {};
  const brandListRows = safeGet(safeSnapshot, ['admin', 'brand_settings', 'brands'], []);
  const brandStateMap = getBrandListStateMapFromRows(brandListRows);

  let archive = filterRowsForUser(safeSnapshot.archive_all || [], user);
  let current = filterRowsForUser(safeSnapshot.current_all || [], user);
  archive = applyBrandListFilterToRows(archive, brandStateMap);
  current = applyBrandListFilterToRows(current, brandStateMap);

  return {
    snapshot: safeSnapshot,
    brandListRows: brandListRows,
    archive: archive,
    current: current,
    balances_current: getClientBalanceRowsForDashboard(user, safeSnapshot.balances_all || []),
    filtered_product_options: user.is_admin ? collectProductOptionsForAdmin(archive.concat(current)) : null
  };
}

function getPreparedDashboardDataForUser_(user) {
  const snapshot = getDashboardServerSnapshot_();
  return getPreparedDashboardDataForUserFromSnapshot_(user, snapshot);
}

function getPreparedDashboardDataForUserFresh_(user) {
  const snapshot = getDashboardServerSnapshotFresh_();
  return getPreparedDashboardDataForUserFromSnapshot_(user, snapshot);
}

function buildDashboardPayloadFromPrepared_(user, prepared) {
  return {
    ok: true,
    user: user,
    archive: prepared.archive,
    current: prepared.current,
    balances_current: prepared.balances_current,
    meta: buildDashboardMetaPayload_(),
    admin: null
  };
}

function getAdminSystemStatus_() {
  return {
    refresh_loop: getRefreshLoopState(),
    refresh_loop_cycle_completed_at: getSystemMetaValue(REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY),
    refresh_loop_cycle_counter: Number(getSystemMetaValue(REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0),
    sales_last_refresh: getSystemMetaValue('sales_last_refresh'),
    client_tag_map_last_refresh: getSystemMetaValue('client_tag_map_last_refresh'),
    client_balances_last_refresh: getSystemMetaValue('client_balances_last_refresh'),
    product_stock_last_refresh: getSystemMetaValue('product_stock_last_refresh'),
    dashboard_snapshot_state: getSystemMetaValue(DASHBOARD_SNAPSHOT_STATE_META_KEY),
    dashboard_snapshot_built_at: getSystemMetaValue(DASHBOARD_SNAPSHOT_BUILT_AT_META_KEY),
    dashboard_snapshot_invalidated_at: getSystemMetaValue(DASHBOARD_SNAPSHOT_INVALIDATED_AT_META_KEY),
    dashboard_snapshot_last_error: getSystemMetaValue(DASHBOARD_SNAPSHOT_LAST_ERROR_META_KEY)
  };
}

function markRefreshLoopCycleCompleted_() {
  var currentCounter = Number(getSystemMetaValue(REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0);
  if (!isFinite(currentCounter) || currentCounter < 0) currentCounter = 0;

  var nextCounter = currentCounter + 1;
  var completedAt = nowText();

  setSystemMetaValue(REFRESH_LOOP_CYCLE_COUNTER_KEY, String(nextCounter));
  setSystemMetaValue(REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY, completedAt);

  return {
    cycle_counter: nextCounter,
    cycle_completed_at: completedAt
  };
}

function serverGetRefreshLoopSignal(sessionToken) {
  requireAuthorizedUserBySession(sessionToken);

  return {
    ok: true,
    cycle_counter: Number(getSystemMetaValue(REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0),
    cycle_completed_at: getSystemMetaValue(REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY),
    sales_last_refresh: getSystemMetaValue('sales_last_refresh'),
    client_tag_map_last_refresh: getSystemMetaValue('client_tag_map_last_refresh'),
    client_balances_last_refresh: getSystemMetaValue('client_balances_last_refresh'),
    product_stock_last_refresh: getSystemMetaValue('product_stock_last_refresh')
  };
}

function serverGetAdminSystemLiveStatus(sessionToken) {
  requireAdminBySession(sessionToken);

  return {
    ok: true,
    fetched_at: nowText(),
    system_status: getAdminSystemStatus_()
  };
}

function serverSessionBootstrap(sessionToken) {
  const user = requireAuthorizedUserBySession(sessionToken);

  return {
    ok: true,
    user: user,
    balances_current: getClientBalanceRowsForDashboard(user),
    admin: user.is_admin ? {
      client_manager_map: getClientManagerMapRowsForAdmin(sessionToken),
      client_alias_map: getClientAliasMapRowsForAdmin(sessionToken),
      client_status_map: getClientStatusMapRowsForAdmin(sessionToken),
      client_tag_map: getClientTagMapRowsForAdmin(sessionToken),
      product_manual_map: getProductManualMapRowsForAdmin(sessionToken),
      product_stock: getProductStockRowsForAdmin(sessionToken),
      system_status: getAdminSystemStatus_()
    } : null
  };
}

function buildDashboardMetaPayload_() {
  return {
    sales_last_refresh: getSystemMetaValue('sales_last_refresh'),
    client_tag_map_last_refresh: getSystemMetaValue('client_tag_map_last_refresh'),
    client_balances_last_refresh: getSystemMetaValue('client_balances_last_refresh'),
    product_stock_last_refresh: getSystemMetaValue('product_stock_last_refresh')
  };
}

function buildDashboardUserCacheKey_(user) {
  var role = normalizeCell(user && user.role);
  var email = normalizeCell(user && user.email).toLowerCase();
  var managerTag = normalizeTagName(user && user.manager_tag);
  return [
    'dashboard_data_v2',
    role || 'user',
    managerTag || 'all',
    email || 'anon',
    getSystemMetaValue('sales_last_refresh') || 'sales0',
    getSystemMetaValue('client_balances_last_refresh') || 'bal0',
    getSystemMetaValue('client_tag_map_last_refresh') || 'tag0',
    getSystemMetaValue('product_stock_last_refresh') || 'stock0',
    getSystemMetaValue(DASHBOARD_SNAPSHOT_STATE_META_KEY) || 'snap0',
    getSystemMetaValue(DASHBOARD_SNAPSHOT_BUILT_AT_META_KEY) || 'built0',
    getSystemMetaValue(DASHBOARD_SNAPSHOT_INVALIDATED_AT_META_KEY) || 'inv0'
  ].join('|');
}

function readJsonCache_(key) {
  var cleanKey = normalizeCell(key);
  if (!cleanKey) return null;
  try {
    var raw = CacheService.getScriptCache().get(cleanKey);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function writeJsonCache_(key, value, ttlSeconds) {
  var cleanKey = normalizeCell(key);
  if (!cleanKey || !value) return;
  try {
    CacheService.getScriptCache().put(
      cleanKey,
      JSON.stringify(value),
      Math.max(1, Number(ttlSeconds) || 1)
    );
  } catch (err) {
    // ignore cache write failures
  }
}

function serverGetDashboardData(sessionToken) {
  const user = requireAuthorizedUserBySession(sessionToken);
  const cacheKey = buildDashboardUserCacheKey_(user);
  const cached = readJsonCache_(cacheKey);
  if (cached && cached.ok) {
    return cached;
  }

  const prepared = getPreparedDashboardDataForUser_(user);
  const payload = buildDashboardPayloadFromPrepared_(user, prepared);

  writeJsonCache_(cacheKey, payload, DASHBOARD_DATA_CACHE_TTL_SECONDS);
  return payload;
}

function serverGetDashboardDataFresh(sessionToken) {
  const user = requireAuthorizedUserBySession(sessionToken);
  const prepared = getPreparedDashboardDataForUserFresh_(user);
  return buildDashboardPayloadFromPrepared_(user, prepared);
}

function serverAdminBootstrap(sessionToken) {
  const user = requireAuthorizedUserBySession(sessionToken);
  const cacheKey = [
    'admin_bootstrap_v1',
    normalizeCell(user && user.email).toLowerCase() || 'anon',
    getSystemMetaValue('sales_last_refresh') || 'sales0',
    getSystemMetaValue('client_balances_last_refresh') || 'bal0',
    getSystemMetaValue('client_tag_map_last_refresh') || 'tag0',
    getSystemMetaValue('product_stock_last_refresh') || 'stock0',
    getSystemMetaValue(DASHBOARD_SNAPSHOT_STATE_META_KEY) || 'snap0',
    getSystemMetaValue(DASHBOARD_SNAPSHOT_BUILT_AT_META_KEY) || 'built0',
    getSystemMetaValue(DASHBOARD_SNAPSHOT_INVALIDATED_AT_META_KEY) || 'inv0'
  ].join('|');
  const cached = readJsonCache_(cacheKey);
  if (cached && cached.ok) {
    return cached;
  }
  const prepared = getPreparedDashboardDataForUser_(user);
  const snapshot = prepared.snapshot || {};
  const snapshotAdmin = snapshot.admin || {};
  const brandListRows = safeGet(snapshotAdmin, ['brand_settings', 'brands'], []);

  const payload = {
    ok: true,
    user: user,
    balances_current: prepared.balances_current,
    admin: user.is_admin ? {
      client_manager_map: safeGet(snapshotAdmin, ['client_manager_map'], []),
      client_alias_map: safeGet(snapshotAdmin, ['client_alias_map'], []),
      client_status_map: safeGet(snapshotAdmin, ['client_status_map'], []),
      client_tag_map: safeGet(snapshotAdmin, ['client_tag_map'], []),
      product_manual_map: safeGet(snapshotAdmin, ['product_manual_map'], []),
      product_stock: safeGet(snapshotAdmin, ['product_stock'], []),
      product_options: safeGet(snapshotAdmin, ['product_options_all'], prepared.filtered_product_options || { brands: [], categories: [], groups: [] }),
      technical_tags_master: safeGet(snapshotAdmin, ['technical_tags_master'], []),
      brand_settings: {
        brands: brandListRows
      },
      system_status: getAdminSystemStatus_()
    } : null
  };

  writeJsonCache_(cacheKey, payload, ADMIN_BOOTSTRAP_CACHE_TTL_SECONDS);
  return payload;
}

function serverGetOkrAdminConfig(sessionToken, monthKeyOrPayload) {
  const user = requireAuthorizedUserBySession(sessionToken);
  const payload = monthKeyOrPayload && typeof monthKeyOrPayload === 'object' ? monthKeyOrPayload : { month_key: monthKeyOrPayload };
  const cleanMonthKey = normalizeCell(payload.month_key || payload.monthKey || payload.month || monthKeyOrPayload);
  ensureOkrPlansSheet();

  const ownManagerTag = normalizeCell(user.manager_tag || user.display_name);
  const allPlans = getOkrPlanRows_(cleanMonthKey);
  const plans = user.is_admin
    ? allPlans
    : allPlans.filter(function(item) {
        return normalizeCell(item.manager_tag).toLowerCase() === ownManagerTag.toLowerCase();
      });

  const efficiencyTotals = getEfficiencyGlobalRevenueTotalsForOkr_(user, payload);
  return {
    ok: true,
    month_key: cleanMonthKey,
    default_manager_tags: user.is_admin ? getOkrDefaultManagerTags_() : [],
    plans: plans,
    efficiency_global_revenue_total: efficiencyTotals.total,
    efficiency_revenue_by_manager: efficiencyTotals.by_manager
  };
}

function getEfficiencyGlobalRevenueTotalsForOkr_(user, payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const fromIso = normalizeCell(data.from_iso || data.from || '');
  const toIso = normalizeCell(data.to_iso || data.to || '');
  const selectedClient = normalizeCell(data.client || '').toLowerCase();
  const excludeService = data.exclude_service_shipments !== false;
  const selectedServiceTags = Array.isArray(data.service_tags)
    ? data.service_tags.map(function(tag) { return normalizeCell(tag).toLowerCase(); }).filter(String)
    : [];

  const snapshot = getDashboardServerSnapshot_();
  const adminLikeUser = {
    email: user.email,
    role: 'admin',
    display_name: user.display_name,
    manager_tag: user.manager_tag,
    is_admin: true,
    is_manager: false,
    authorized: true
  };
  const prepared = getPreparedDashboardDataForUserFromSnapshot_(adminLikeUser, snapshot);
  const rows = [].concat(prepared.archive || [], prepared.current || []);
  const byManager = {};
  let total = 0;

  rows.forEach(function(row) {
    const rowDate = normalizeCell(row.date);
    if (fromIso && rowDate && rowDate < fromIso) return;
    if (toIso && rowDate && rowDate > toIso) return;

    const managerTag = normalizeCell(row.manager_tag || row.effective_manager || row.manager).toLowerCase();
    if (!managerTag || managerTag === 'каса' || managerTag === 'без тега') return;

    if (selectedClient && normalizeCell(row.client).toLowerCase() !== selectedClient) return;

    const status = normalizeCell(row.status).toLowerCase();
    if (status === 'видалено' || status === 'deleted' || status === 'скасовано' || status === 'cancelled') return;
    if (excludeService && (status.indexOf('служб') !== -1 || status.indexOf('service') !== -1)) return;

    if (selectedServiceTags.length) {
      const tagText = [row.tags, row.tag, row.client_tags, row.manager_group_raw, row.status]
        .map(function(value) { return normalizeCell(value).toLowerCase(); })
        .join(' | ');
      const hasTag = selectedServiceTags.some(function(tag) { return tagText.indexOf(tag) !== -1; });
      if (!hasTag) return;
    }

    const revenue = Number(row.revenue || 0) || 0;
    if (!revenue) return;
    byManager[managerTag] = (byManager[managerTag] || 0) + revenue;
    total += revenue;
  });

  return {
    total: Math.round(total * 100) / 100,
    by_manager: byManager
  };
}

function serverSaveOkrAdminConfig(sessionToken, payload) {
  const user = requireAdminBySession(sessionToken);
  const data = payload && typeof payload === 'object' ? payload : {};
  const cleanMonthKey = normalizeCell(data.month_key);
  if (!cleanMonthKey) {
    throw new Error('Не передано місяць для OKR-плану');
  }

  const defaultTags = setOkrDefaultManagerTags_(data.default_manager_tags);
  const plans = saveOkrPlanRows_(
    cleanMonthKey,
    Array.isArray(data.plans) ? data.plans : [],
    user.email || user.display_name || 'admin'
  );

  return {
    ok: true,
    month_key: cleanMonthKey,
    default_manager_tags: defaultTags,
    plans: plans
  };
}

function serverSaveBrandList(sessionToken, brands) {
  const user = requireAdminBySession(sessionToken);
  ensureBrandListSheet();

  const payload = Array.isArray(brands) ? brands : [];
  const sheet = getSpreadsheet().getSheetByName(SHEET_BRAND_LIST);
  ensureHeadersForSheet(sheet, BRAND_LIST_HEADERS);

  const values = sheet.getDataRange().getValues();
  const rowMap = {};
  for (var i = 1; i < values.length; i++) {
    const brandName = normalizeCell(values[i][0]);
    if (brandName) rowMap[brandName] = i + 1;
  }

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const actor = normalizeCell(user.email || user.display_name || 'admin');

  payload.forEach(function(item) {
    const brand = normalizeCell(item && item.brand);
    if (!brand) return;
    const isActive = normalizeActiveFlag(item && item.active, true);
    const rowNumber = rowMap[brand];
    const rowValues = [[brand, isActive ? 'TRUE' : 'FALSE', now, actor]];

    if (rowNumber) {
      sheet.getRange(rowNumber, 1, 1, BRAND_LIST_HEADERS.length).setValues(rowValues);
    } else {
      sheet.appendRow(rowValues[0]);
      rowMap[brand] = sheet.getLastRow();
    }
  });

  markDashboardServerSnapshotStale_('brand_list_changed');

  return {
    ok: true,
    brands: getBrandListRows()
  };
}

function serverUpsertClientManagerMap(sessionToken, client, effectiveManager, active) {
  const user = requireAdminBySession(sessionToken);

  const cleanClient = normalizeCell(client);
  const cleanManager = normalizeCell(effectiveManager);
  const isActive = String(active).toLowerCase() !== 'false';

  if (!cleanClient) throw new Error('Не вказано client');
  if (!cleanManager) throw new Error('Не вказано effective_manager');

  const sheet = getOrCreateSheet(SHEET_CLIENT_MANAGER_MAP);
  ensureHeadersForSheet(sheet, CLIENT_MANAGER_MAP_HEADERS);

  const values = sheet.getDataRange().getValues();
  let existingRow = 0;

  for (var i = 1; i < values.length; i++) {
    const currentClient = normalizeCell(values[i][0]);
    if (currentClient === cleanClient) {
      existingRow = i + 1;
      break;
    }
  }

  const rowData = [cleanClient, cleanManager, user.email, nowText(), isActive];

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    markDashboardServerSnapshotStale_('client_manager_map_changed');
    return { ok: true, action: 'updated', row_number: existingRow };
  }

  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
  markDashboardServerSnapshotStale_('client_manager_map_changed');
  return { ok: true, action: 'created', row_number: newRow };
}

function serverDeactivateClientManagerMap(sessionToken, client) {
  const user = requireAdminBySession(sessionToken);
  const cleanClient = normalizeCell(client);

  if (!cleanClient) throw new Error('Не вказано client');

  const sheet = getOrCreateSheet(SHEET_CLIENT_MANAGER_MAP);
  ensureHeadersForSheet(sheet, CLIENT_MANAGER_MAP_HEADERS);

  const values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    const currentClient = normalizeCell(values[i][0]);
    if (currentClient === cleanClient) {
      sheet.getRange(i + 1, 3, 1, 3).setValues([[user.email, nowText(), false]]);
      markDashboardServerSnapshotStale_('client_manager_map_changed');
      return { ok: true, action: 'deactivated', row_number: i + 1 };
    }
  }

  throw new Error('Клієнта не знайдено в client_manager_map');
}

function serverUpsertClientAliasMap(sessionToken, sourceClient, targetClient, active) {
  const user = requireAdminBySession(sessionToken);

  const cleanSource = normalizeCell(sourceClient);
  const cleanTarget = normalizeCell(targetClient);
  const isActive = String(active).toLowerCase() !== 'false';

  if (!cleanSource) throw new Error('Не вказано source_client');
  if (!cleanTarget) throw new Error('Не вказано target_client');
  if (cleanSource === cleanTarget) throw new Error('Нова назва має відрізнятися від поточної');

  const sheet = getOrCreateSheet(SHEET_CLIENT_ALIAS_MAP);
  ensureHeadersForSheet(sheet, CLIENT_ALIAS_MAP_HEADERS);

  const values = sheet.getDataRange().getValues();
  let existingRow = 0;

  for (var i = 1; i < values.length; i++) {
    const currentSource = normalizeCell(values[i][0]);
    if (currentSource === cleanSource) {
      existingRow = i + 1;
      break;
    }
  }

  const rowData = [cleanSource, cleanTarget, user.email, nowText(), isActive];

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    markDashboardServerSnapshotStale_('client_alias_map_changed');
    return { ok: true, action: 'updated', row_number: existingRow };
  }

  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
  markDashboardServerSnapshotStale_('client_alias_map_changed');
  return { ok: true, action: 'created', row_number: newRow };
}

function serverUpsertClientStatusMap(sessionToken, client, status, active) {
  const user = requireAdminBySession(sessionToken);

  const cleanClient = normalizeCell(client);
  const cleanStatus = normalizeCell(status).toLowerCase();
  const isActive = String(active).toLowerCase() !== 'false';

  if (!cleanClient) throw new Error('Не вказано client');
  if (!cleanStatus) throw new Error('Не вказано status');
  if (['closed', 'return', 'new'].indexOf(cleanStatus) === -1) throw new Error('Непідтримуваний статус клієнта');

  const sheet = getOrCreateSheet(SHEET_CLIENT_STATUS_MAP);
  ensureHeadersForSheet(sheet, CLIENT_STATUS_MAP_HEADERS);

  const values = sheet.getDataRange().getValues();
  let existingRow = 0;

  for (var i = 1; i < values.length; i++) {
    const currentClient = normalizeCell(values[i][0]);
    if (currentClient === cleanClient) {
      existingRow = i + 1;
      break;
    }
  }

  const rowData = [cleanClient, cleanStatus, user.email, nowText(), isActive];

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    markDashboardServerSnapshotStale_('client_status_map_changed');
    return { ok: true, action: 'updated', row_number: existingRow };
  }

  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
  markDashboardServerSnapshotStale_('client_status_map_changed');
  return { ok: true, action: 'created', row_number: newRow };
}

function serverBatchUpsertClientStatusMap(sessionToken, items) {
  const user = requireAdminBySession(sessionToken);
  const input = Array.isArray(items) ? items : [];
  if (!input.length) throw new Error('Порожній список статусів');

  const normalized = input.map(function(item) {
    const cleanClient = normalizeCell(item && item.client);
    const cleanStatus = normalizeCell(item && item.status).toLowerCase();
    const isActive = String(item && item.active).toLowerCase() !== 'false';

    if (!cleanClient) throw new Error('У списку є рядок без client');
    if (!cleanStatus) throw new Error('У списку є рядок без status');
    if (['closed', 'return', 'new'].indexOf(cleanStatus) === -1) {
      throw new Error('Непідтримуваний статус клієнта: ' + cleanStatus);
    }

    return {
      client: cleanClient,
      status: cleanStatus,
      active: isActive
    };
  });

  const sheet = getOrCreateSheet(SHEET_CLIENT_STATUS_MAP);
  ensureHeadersForSheet(sheet, CLIENT_STATUS_MAP_HEADERS);

  const values = sheet.getDataRange().getValues();
  const existingByClient = {};
  for (var i = 1; i < values.length; i++) {
    const currentClient = normalizeCell(values[i][0]);
    if (currentClient) existingByClient[currentClient] = i + 1;
  }

  const updatedAt = nowText();
  let updated = 0;
  const rowsToAppend = [];

  normalized.forEach(function(item) {
    const rowData = [item.client, item.status, user.email, updatedAt, item.active];
    const existingRow = existingByClient[item.client];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      updated++;
    } else {
      rowsToAppend.push(rowData);
      existingByClient[item.client] = true;
    }
  });

  if (rowsToAppend.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, CLIENT_STATUS_MAP_HEADERS.length).setValues(rowsToAppend);
  }

  markDashboardServerSnapshotStale_('client_status_map_batch_changed');
  return {
    ok: true,
    processed: normalized.length,
    updated: updated,
    created: rowsToAppend.length
  };
}


// --------------------------------------------------
// PRODUCT MANUAL MAP / BUSINESS MAP
// --------------------------------------------------

function getBusinessCategoryMap() {
  return {
    'Чохли': [
      'Чохли для iPad', 'Чохли для iPhone', 'Чохли для Samsung', 'Чохли для MacBook',
      'Чохли для AirPods', 'Чохли для AirTag', 'Ремінці для Apple Watch',
      'Шнурки для iPhone', 'Сумки для аксесуарів'
    ],
    'Захисне скло | плівки': [
      'Захисне скло для iPad', 'Захисне скло для iPhone', 'Захисне скло для Samsung',
      'Захисне скло для Apple Watch', 'Захисне скло для камери iPhone',
      'Захисне скло для камери Samsung', 'Захисні плівки для iPad', 'Захисні плівки для MacBook'
    ],
    'Зарядні пристрої': [
      'Бездротові зарядки', 'Кабелі', 'Адаптери', 'PowerBank',
      'Зарядки для Ноутбуків', 'Зарядні для Apple Watch'
    ],
    'Інші Аксесуари': [
      'Автотримачі', 'Прикурювачі', 'Навушники', 'Pencil',
      'Кабелі - перехідники', 'Перехідники/USB-C аксесуари',
      'Перехідники для розетки', 'Інші Аксесуари'
    ]
  };
}

function getBusinessGroupToCategoryMap() {
  const base = {};
  const catMap = getBusinessCategoryMap();
  Object.keys(catMap).forEach(function(category) {
    catMap[category].forEach(function(group) {
      base[normalizeCell(group).toLowerCase()] = category;
    });
  });
  return base;
}

function normalizeProductGroupBusiness(rawGroup, rawProduct) {
  const path = normalizeCell(rawGroup).toLowerCase();
  const product = normalizeCell(rawProduct).toLowerCase();
  const text = (path + ' | ' + product).toLowerCase();
  const groups = Object.keys(getBusinessGroupToCategoryMap());

  for (var i = 0; i < groups.length; i++) {
    if (groups[i] && text.indexOf(groups[i]) !== -1) return Object.keys(getBusinessGroupToCategoryMap()).reduce(function(acc, key) {
      return key === groups[i] ? groups[i] : acc;
    }, '');
  }

  if (/чохол|case/.test(text)) {
    if (/ipad/.test(text)) return 'чохли для ipad';
    if (/iphone/.test(text)) return 'чохли для iphone';
    if (/samsung/.test(text)) return 'чохли для samsung';
    if (/macbook/.test(text)) return 'чохли для macbook';
    if (/airpods/.test(text)) return 'чохли для airpods';
    if (/airtag/.test(text)) return 'чохли для airtag';
  }
  if (/ремінец|ремешок|band|strap/.test(text)) return 'ремінці для apple watch';
  if (/шнурок|lanyard/.test(text)) return 'шнурки для iphone';
  if (/organizer|сумк/.test(text)) return 'сумки для аксесуарів';

  if (/glass|скло/.test(text)) {
    if (/camera.*iphone|камери iphone/.test(text)) return 'захисне скло для камери iphone';
    if (/camera.*samsung|камери samsung/.test(text)) return 'захисне скло для камери samsung';
    if (/ipad/.test(text)) return 'захисне скло для ipad';
    if (/iphone/.test(text)) return 'захисне скло для iphone';
    if (/samsung/.test(text)) return 'захисне скло для samsung';
    if (/watch/.test(text)) return 'захисне скло для apple watch';
  }
  if (/плівк|film/.test(text)) {
    if (/ipad/.test(text)) return 'захисні плівки для ipad';
    if (/macbook/.test(text)) return 'захисні плівки для macbook';
  }

  if (/wireless|бездротов/.test(text)) return 'бездротові зарядки';
  if (/power ?bank/.test(text)) return 'powerbank';
  if (/adapter|адаптер/.test(text)) return 'адаптери';
  if (/cable|кабель/.test(text) && /перехід|adapter|usb-c аксесуар/.test(text)) return 'кабелі - перехідники';
  if (/cable|кабель/.test(text)) return 'кабелі';
  if (/(laptop|ноутбук|macbook).*(заряд|charge)/.test(text) || /(заряд|charge).*(laptop|ноутбук|macbook)/.test(text)) return 'зарядки для ноутбуків';
  if (/watch/.test(text) && /(заряд|charge)/.test(text)) return 'зарядні для apple watch';

  if (/автотримач|holder/.test(text)) return 'автотримачі';
  if (/прикурювач|car charger/.test(text)) return 'прикурювачі';
  if (/навушник|earbud|headphone/.test(text)) return 'навушники';
  if (/pencil/.test(text)) return 'pencil';
  if (/usb-c аксесуар|hub|dock|card reader/.test(text)) return 'перехідники/usb-c аксесуари';
  if (/розетк/.test(text)) return 'перехідники для розетки';
  return '';
}

function toTitleCaseUkrGroup(normalizedGroup) {
  if (!normalizedGroup) return '';
  const map = getBusinessGroupToCategoryMap();
  const key = normalizeCell(normalizedGroup).toLowerCase();
  const found = Object.keys(map).find(function(k) { return k === key; });
  if (!found) return normalizedGroup;
  // restore original capitalization from source map
  const catMap = getBusinessCategoryMap();
  for (var c in catMap) {
    for (var i = 0; i < catMap[c].length; i++) {
      if (normalizeCell(catMap[c][i]).toLowerCase() === key) return catMap[c][i];
    }
  }
  return normalizedGroup;
}

function categoryByProductGroup(groupName) {
  const key = normalizeCell(groupName).toLowerCase();
  return getBusinessGroupToCategoryMap()[key] || '';
}

function buildProductManualKey(sku, product) {
  return [normalizeCell(sku), normalizeCell(product)].join('||').toLowerCase();
}

function ensureProductManualMapSheet() {
  const ss = getSpreadsheet();
  return ensureSystemSheet(ss, SHEET_PRODUCT_MANUAL_MAP, PRODUCT_MANUAL_MAP_HEADERS);
}

function getProductManualMapRows() {
  ensureProductManualMapSheet();
  return getSheetObjects(SHEET_PRODUCT_MANUAL_MAP);
}

function getActiveProductManualMap() {
  const map = {};
  getProductManualMapRows().forEach(function(row) {
    if (!isTruthyCell(row.active)) return;
    const key = buildProductManualKey(row.sku, row.product);
    if (!key || key === '||') return;
    map[key] = {
      sku: normalizeCell(row.sku),
      product: normalizeCell(row.product),
      brand: normalizeCell(row.brand),
      category: normalizeCell(row.category),
      product_group: normalizeCell(row.product_group)
    };
  });
  return map;
}

function getProductManualMapRowsForAdmin(sessionToken) {
  requireAdminBySession(sessionToken);
  return getProductManualMapRowsForAdmin_();
}

function getClientAliasMapRowsForAdmin(sessionToken) {
  requireAdminBySession(sessionToken);
  return getClientAliasMapRowsForAdmin_();
}

function getClientStatusMapRowsForAdmin(sessionToken) {
  requireAdminBySession(sessionToken);
  return getClientStatusMapRowsForAdmin_();
}

function getProductStockRowsForAdmin(sessionToken) {
  requireAdminBySession(sessionToken);
  return getProductStockRowsForAdmin_();
}

function serverGetManagerStockBootstrap(sessionToken) {
  requireAuthorizedUserBySession(sessionToken);

  return {
    ok: true,
    product_stock: getProductStockRowsForAdmin_(),
    system_status: {
      product_stock_last_refresh: getSystemMetaValue('product_stock_last_refresh')
    }
  };
}

function serverGetBonusesBootstrap(sessionToken) {
  requireAuthorizedUserBySession(sessionToken);

  return {
    ok: true,
    client_status_map: getClientStatusMapRowsForAdmin_(),
    bonuses_log: getBonusesLogRowsForAdmin_()
  };
}

function collectProductOptionsForAdmin(rows) {
  const brands = {};
  const categories = {};
  const groups = {};
  rows.forEach(function(row) {
    const brand = normalizeCell(row.brand);
    const group = normalizeCell(row.product_group);
    const category = normalizeCell(row.category) || categoryByProductGroup(group);
    if (brand) brands[brand] = true;
    if (group) groups[group] = true;
    if (category) categories[category] = true;
  });
  Object.keys(getBusinessCategoryMap()).forEach(function(cat) { categories[cat] = true; });
  Object.keys(getBusinessGroupToCategoryMap()).forEach(function(g) { groups[toTitleCaseUkrGroup(g)] = true; });
  getProductManualMapRows().forEach(function(row){
    if (normalizeCell(row.brand)) brands[normalizeCell(row.brand)] = true;
    if (normalizeCell(row.product_group)) groups[normalizeCell(row.product_group)] = true;
    if (normalizeCell(row.category)) categories[normalizeCell(row.category)] = true;
  });
  return {
    brands: Object.keys(brands).sort(function(a,b){ return a.localeCompare(b,'uk'); }),
    categories: Object.keys(categories).sort(function(a,b){ return a.localeCompare(b,'uk'); }),
    groups: Object.keys(groups).sort(function(a,b){ return a.localeCompare(b,'uk'); })
  };
}

function applyProductManualMap(rows) {
  if (!Array.isArray(rows)) return [];
  const manualMap = getActiveProductManualMap();
  return rows.map(function(row) {
    const enriched = {};
    Object.keys(row).forEach(function(key){ enriched[key] = row[key]; });
    const key = buildProductManualKey(row.sku, row.product);
    const manual = manualMap[key];
    if (manual) {
      if (manual.brand) enriched.brand = manual.brand;
      if (manual.product_group) enriched.product_group = manual.product_group;
      if (manual.category) enriched.category = manual.category;
    }
    if (!normalizeCell(enriched.product_group)) {
      const normalized = normalizeProductGroupBusiness(row.product_group, row.product);
      enriched.product_group = toTitleCaseUkrGroup(normalized);
    }
    if (!normalizeCell(enriched.category)) {
      enriched.category = categoryByProductGroup(enriched.product_group);
    }
    return enriched;
  });
}

function serverUpsertProductManualMap(sessionToken, payload) {
  const user = requireAdminBySession(sessionToken);
  ensureProductManualMapSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_PRODUCT_MANUAL_MAP);
  const sku = normalizeCell(payload && payload.sku);
  const product = normalizeCell(payload && payload.product);
  const brand = normalizeCell(payload && payload.brand);
  const category = normalizeCell(payload && payload.category);
  const productGroup = normalizeCell(payload && payload.product_group);
  if (!sku && !product) throw new Error('Не вказано sku або product');
  const key = buildProductManualKey(sku, product);

  const values = sheet.getDataRange().getValues();
  let existingRow = 0;
  for (var i = 1; i < values.length; i++) {
    if (buildProductManualKey(values[i][0], values[i][1]) === key) {
      existingRow = i + 1; break;
    }
  }
  const rowData = [sku, product, brand, category, productGroup, user.email, nowText(), true];
  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, rowData.length).setValues([rowData]);
  }
  markDashboardServerSnapshotStale_('product_manual_map_changed');
  return { ok: true };
}

// --------------------------------------------------
// COMMON HELPERS
// --------------------------------------------------

function safeUrlFetch_(url, options) {
  const opts = Object.assign({}, options || {}, { muteHttpExceptions: true });
  let lastText = '';
  let lastCode = 0;

  for (var attempt = 0; attempt < 3; attempt++) {
    const response = UrlFetchApp.fetch(url, opts);
    lastCode = response.getResponseCode();
    lastText = response.getContentText();

    if (lastCode >= 200 && lastCode < 300) {
      Utilities.sleep(80);
      return response;
    }

    const isBandwidth = String(lastText || '').indexOf('Bandwidth quota exceeded') !== -1;
    const isRateLike = lastCode === 429 || lastCode === 503 || isBandwidth;
    if (!isRateLike || attempt === 2) break;

    Utilities.sleep(isBandwidth ? 15000 : 5000);
  }

  throw new Error('HTTP error ' + lastCode + '\n' + lastText);
}

function fetchJsonUrl(url, headers) {
  const response = safeUrlFetch_(url, {
    method: 'get',
    headers: headers || {}
  });

  return JSON.parse(response.getContentText());
}

function apiGet(url) {
  return fetchJsonUrl(url, {
    Authorization: 'Bearer ' + getMoySkladToken(),
    Accept: 'application/json;charset=utf-8',
    'Content-Type': 'application/json;charset=utf-8'
  });
}

function buildQuery(params) {
  const pairs = [];
  Object.keys(params).forEach(function(key) {
    const value = params[key];
    if (value !== null && value !== undefined && String(value).length > 0) {
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    }
  });
  return pairs.join('&');
}

function money(v) {
  return Number(v || 0) / 100;
}

function round2(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}

function safeGet(obj, path, fallback) {
  try {
    let cur = obj;
    for (var i = 0; i < path.length; i++) {
      if (cur === null || cur === undefined) return fallback || '';
      cur = cur[path[i]];
    }
    return cur === null || cur === undefined ? (fallback || '') : cur;
  } catch (e) {
    return fallback || '';
  }
}

function normalizeCell(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function isTruthyCell(v) {
  const t = String(v || '').trim().toLowerCase();
  return t === 'true' || t === '1' || t === 'yes' || t === 'y';
}

function normalizeActiveFlag(v, defaultValue) {
  if (v === true || v === false) return v;
  const text = String(v == null ? '' : v).trim();
  if (!text) return defaultValue !== false;
  return isTruthyCell(text);
}

function padSku(value) {
  const digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(5, '0').slice(-5);
}

function momentToMonth(moment) {
  if (!moment) return '';
  const m = /^(\d{4})-(\d{2})-/.exec(moment);
  if (!m) return '';
  return m[2] + '.' + m[1].slice(2);
}

function nowText() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function getSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Скрипт має бути прив’язаний до Google Sheets');
  return ss;
}

function getOrCreateSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureHeadersForSheet(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function getNextDayStart(dateObj) {
  const next = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1);
  const yyyy = next.getFullYear();
  const mm = ('0' + (next.getMonth() + 1)).slice(-2);
  const dd = ('0' + next.getDate()).slice(-2);
  return yyyy + '-' + mm + '-' + dd + ' 00:00:00';
}

function getTodayBounds() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = ('0' + (now.getMonth() + 1)).slice(-2);
  const dd = ('0' + now.getDate()).slice(-2);

  return {
    start: yyyy + '-' + mm + '-' + dd + ' 00:00:00',
    endExclusive: getNextDayStart(now),
    dayPrefix: yyyy + '-' + mm + '-' + dd
  };
}

function getCurrentMonthRange() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = ('0' + (now.getMonth() + 1)).slice(-2);

  const start = yyyy + '-' + mm + '-01 00:00:00';

  const nextMonth = new Date(yyyy, now.getMonth() + 1, 1);
  const yyyy2 = nextMonth.getFullYear();
  const mm2 = ('0' + (nextMonth.getMonth() + 1)).slice(-2);
  const endExclusive = yyyy2 + '-' + mm2 + '-01 00:00:00';

  return {
    start: start,
    endExclusive: endExclusive,
    monthPrefix: yyyy + '-' + mm
  };
}

function getMonthRangeByYearMonth(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) {
    throw new Error('Некоректний місяць: ' + year + '-' + month);
  }

  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const start = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-01 00:00:00');
  const endExclusive = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy-MM-01 00:00:00');
  const monthPrefix = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM');

  return {
    start: start,
    endExclusive: endExclusive,
    monthPrefix: monthPrefix,
    monthLabel: Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'MM.yy')
  };
}

function getMonthRowNumbersByDateColumn(sheet, monthPrefix, dateColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const dateValues = sheet.getRange(2, dateColumn, lastRow - 1, 1).getValues();
  const rowNumbers = [];

  for (var i = 0; i < dateValues.length; i++) {
    const dateText = String(dateValues[i][0] || '');
    if (dateText.indexOf(monthPrefix) === 0) {
      rowNumbers.push(i + 2);
    }
  }

  return rowNumbers;
}

function getDayRowNumbersByDateColumn(sheet, dayPrefix, dateColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const dateValues = sheet.getRange(2, dateColumn, lastRow - 1, 1).getValues();
  const rowNumbers = [];

  for (var i = 0; i < dateValues.length; i++) {
    const dateText = String(dateValues[i][0] || '');
    if (dateText.indexOf(dayPrefix) === 0) {
      rowNumbers.push(i + 2);
    }
  }

  return rowNumbers;
}

function deleteRowsInBlocks(sheet, rowNumbers) {
  if (!rowNumbers.length) return;

  const blocks = [];
  let start = rowNumbers[0];
  let count = 1;

  for (var i = 1; i < rowNumbers.length; i++) {
    if (rowNumbers[i] === rowNumbers[i - 1] + 1) {
      count++;
    } else {
      blocks.push({ start: start, count: count });
      start = rowNumbers[i];
      count = 1;
    }
  }
  blocks.push({ start: start, count: count });

  for (var j = blocks.length - 1; j >= 0; j--) {
    sheet.deleteRows(blocks[j].start, blocks[j].count);
  }
}

function getSalesYearExportYears_() {
  const startYear = Number(String(MIN_DATE || '2024').slice(0, 4)) || 2024;
  const currentYear = new Date().getFullYear();
  const years = [];

  for (var year = startYear; year <= currentYear + 1; year++) {
    years.push(year);
  }

  return years;
}

function getSalesYearSheetName_(year) {
  return SHEET_SALES_YEAR_PREFIX + String(year);
}

function getSalesYearTargets_(year) {
  const numericYear = Number(year);
  if (numericYear === 2024) {
    return [
      { sheetName: 'sales_2024_1', year: 2024, monthFrom: '2024-01', monthTo: '2024-06' },
      { sheetName: 'sales_2024_2', year: 2024, monthFrom: '2024-07', monthTo: '2024-12' }
    ];
  }

  return [
    { sheetName: getSalesYearSheetName_(numericYear), year: numericYear, monthFrom: '', monthTo: '' }
  ];
}

function ensureSalesYearSheetByName_(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  ensureExactHeaders(sheet, HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange('G:G').setNumberFormat('@');
  return sheet;
}

function ensureSalesYearSheet_(year) {
  return ensureSalesYearSheetByName_(getSalesYearSheetName_(year));
}

function getSalesMainSheetRows_() {
  const sheet = getSpreadsheet().getSheetByName(SHEET_MAIN);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  return values.slice(1).filter(function(row) {
    return String(row[1] || '').trim();
  });
}

function filterSalesRowsByYear_(rows, year) {
  const yearPrefix = String(year) + '-';

  return (Array.isArray(rows) ? rows : []).filter(function(row) {
    return String(row[1] || '').indexOf(yearPrefix) === 0;
  });
}

function filterSalesRowsByMonthWindow_(rows, monthFrom, monthTo) {
  const from = normalizeCell(monthFrom);
  const to = normalizeCell(monthTo);

  return (Array.isArray(rows) ? rows : []).filter(function(row) {
    const monthPrefix = String(row[1] || '').slice(0, 7);
    if (!monthPrefix) return false;
    if (from && monthPrefix < from) return false;
    if (to && monthPrefix > to) return false;
    return true;
  });
}

function buildSalesYearSheetsForN8n() {
  const years = getSalesYearExportYears_();
  const sourceRows = getSalesMainSheetRows_();
  const report = [];

  years.forEach(function(year) {
    const yearRows = filterSalesRowsByYear_(sourceRows, year);

    getSalesYearTargets_(year).forEach(function(target) {
      const sheet = ensureSalesYearSheetByName_(target.sheetName);
      const targetRows = filterSalesRowsByMonthWindow_(yearRows, target.monthFrom, target.monthTo);

      sheet.clearContents();
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

      if (targetRows.length) {
        sheet.getRange(2, 1, targetRows.length, HEADERS.length).setValues(targetRows);
      }

      sheet.setFrozenRows(1);
      sheet.getRange('G:G').setNumberFormat('@');
      report.push({
        sheet: target.sheetName,
        year: year,
        rows_written: targetRows.length
      });
    });
  });

  Logger.log('buildSalesYearSheetsForN8n -> ' + JSON.stringify(report));
  return {
    ok: true,
    years: years,
    report: report
  };
}

function refreshSalesYearSheetCurrentMonth() {
  const sourceSheet = getSpreadsheet().getSheetByName(SHEET_MAIN);
  if (!sourceSheet) {
    throw new Error('Не знайдено основний аркуш продажів: ' + SHEET_MAIN);
  }

  const range = getCurrentMonthRange();
  const year = Number(range.monthPrefix.slice(0, 4));
  const targetSheet = ensureSalesYearSheet_(year);
  const sourceRows = filterSalesRowsByYear_(getSalesMainSheetRows_(), year)
    .filter(function(row) {
      return String(row[1] || '').indexOf(range.monthPrefix) === 0;
    });

  const monthRowNumbers = getMonthRowNumbersByDateColumn(targetSheet, range.monthPrefix, 2);
  deleteRowsInBlocks(targetSheet, monthRowNumbers);

  if (targetSheet.getLastRow() === 0) {
    targetSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  if (sourceRows.length) {
    const startRow = Math.max(2, targetSheet.getLastRow() + 1);
    targetSheet.getRange(startRow, 1, sourceRows.length, HEADERS.length).setValues(sourceRows);
  }

  targetSheet.setFrozenRows(1);
  targetSheet.getRange('G:G').setNumberFormat('@');

  const result = {
    ok: true,
    sheet: getSalesYearSheetName_(year),
    year: year,
    month_prefix: range.monthPrefix,
    deleted_rows: monthRowNumbers.length,
    inserted_rows: sourceRows.length
  };

  Logger.log('refreshSalesYearSheetCurrentMonth -> ' + JSON.stringify(result));
  return result;
}

function deleteUnusedN8nAndDebugSheets() {
  const ss = getSpreadsheet();
  const sheetNames = [
    'sales_2024_1',
    'sales_2024_2',
    'sales_2025',
    'sales_2026',
    'sales_2027',
    SHEET_PAYMENTS_MAIN,
    SHEET_PAYMENTS_ARCHIVE,
    SHEET_PAYMENTS_CURRENT,
    SHEET_CLIENT_BALANCES_DEBUG,
    SHEET_CLIENT_BALANCES_ACCOUNTS_DEBUG
  ];
  const report = [];

  sheetNames.forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      report.push({ sheet: sheetName, status: 'not_found' });
      return;
    }

    ss.deleteSheet(sheet);
    report.push({ sheet: sheetName, status: 'deleted' });
  });

  Logger.log('deleteUnusedN8nAndDebugSheets -> ' + JSON.stringify(report));
  return {
    ok: true,
    report: report
  };
}

function clampStartDate(startText) {
  if (!startText) return MIN_DATE;
  return startText < MIN_DATE ? MIN_DATE : startText;
}

function getSheetObjects(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(function(h) {
    return String(h || '').trim();
  });

  return values.slice(1).map(function(row) {
    const obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

function sheetToObjects(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(function(h) {
    return String(h).trim();
  });

  return values.slice(1).map(function(row) {
    const obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

// --------------------------------------------------
// CLIENT TAG MAP (from MoySklad counterparty tags)
// --------------------------------------------------

function normalizeTagName(v) {
  return normalizeCell(v).toLowerCase();
}

function uniqueStrings(values) {
  const seen = {};
  const out = [];

  (values || []).forEach(function(v) {
    const clean = normalizeCell(v);
    const key = clean.toLowerCase();
    if (!clean || seen[key]) return;
    seen[key] = true;
    out.push(clean);
  });

  return out;
}

function extractTagNamesFromCounterparty(counterparty) {
  const raw = [];

  [counterparty && counterparty.tags, counterparty && counterparty.groups].forEach(function(collection) {
    if (!Array.isArray(collection)) return;
    collection.forEach(function(item) {
      if (typeof item === 'string') raw.push(item);
      else raw.push(safeGet(item, ['name'], ''));
    });
  });

  return uniqueStrings(raw);
}

function getDefaultTechnicalClientTags() {
  return [
    'клієнти',
    'роздрібні клієнти',
    'роздрібний клієнт',
    'website',
    'web site',
    'web-site',
    'site',
    'сайт',
    'спільні - доопрацювати',
    'спільні',
    'shared',
    'розница',
    'розничные клиенты'
  ];
}

function ensureClientTagRulesSheet() {
  const ss = getSpreadsheet();
  const report = ensureSystemSheet(ss, SHEET_CLIENT_TAG_RULES, CLIENT_TAG_RULES_HEADERS);
  const sh = ss.getSheetByName(SHEET_CLIENT_TAG_RULES);
  ensureHeadersForSheet(sh, CLIENT_TAG_RULES_HEADERS);

  if (sh.getLastRow() <= 1) {
    const defaults = getDefaultTechnicalClientTags().map(function(tag) {
      return [tag, 'technical', 'yes', 'default'];
    });
    if (defaults.length) sh.getRange(2, 1, defaults.length, CLIENT_TAG_RULES_HEADERS.length).setValues(defaults);
  }

  return report;
}

function getTechnicalClientTags() {
  const defaults = getDefaultTechnicalClientTags();
  const ss = getSpreadsheet();
  const sh = ss.getSheetByName(SHEET_CLIENT_TAG_RULES);
  if (!sh || sh.getLastRow() < 2) return defaults;

  const values = sh.getRange(2, 1, sh.getLastRow() - 1, CLIENT_TAG_RULES_HEADERS.length).getValues();
  const collected = [];
  values.forEach(function(row) {
    const tagName = normalizeTagName(row[0]);
    const role = normalizeTagName(row[1]);
    const active = normalizeTagName(row[2]);
    if (!tagName) return;
    if (active && ['no', 'false', '0', 'off', 'inactive', 'ні'].indexOf(active) !== -1) return;
    if (['technical', 'service', 'exclude', 'system'].indexOf(role) === -1) return;
    collected.push(tagName);
  });

  return uniqueStrings(defaults.concat(collected)).map(normalizeTagName);
}

function getTechnicalTagsMasterForDashboard() {
  return getTechnicalClientTags().map(function(tagName, index) {
    return {
      row_number: index + 2,
      tag_name: normalizeTagName(tagName),
      tag_role: 'technical',
      active: 'yes',
      note: 'client_tag_rules'
    };
  });
}

function isTechnicalClientTag(tagName) {
  const tag = normalizeTagName(tagName);
  return getTechnicalClientTags().indexOf(tag) !== -1;
}

function getManagerTagCandidates(tagNames) {
  return uniqueStrings(tagNames || []).map(normalizeTagName).filter(function(tag) {
    return tag && !isTechnicalClientTag(tag) && tag !== 'клієнти';
  });
}

function resolveManagerTagFromTags(tagNames) {
  const managerTags = getManagerTagCandidates(tagNames);
  if (!managerTags.length) return '';
  return normalizeTagName(managerTags[managerTags.length - 1]);
}

function extractExcludeTags(tagNames, managerTag) {
  const manager = normalizeTagName(managerTag);

  return uniqueStrings((tagNames || []).filter(function(tag) {
    const clean = normalizeTagName(tag);
    if (!clean) return false;
    if (clean === 'клієнти') return false;
    if (manager && clean === manager) return false;
    return true;
  })).map(normalizeTagName);
}

function normalizeAttributeName(name) {
  return normalizeCell(name).toLowerCase().replace(/\s+/g, ' ').trim();
}

function extractDeferredDaysFromCounterparty(counterparty) {
  const attrs = counterparty && counterparty.attributes;
  if (!Array.isArray(attrs) || !attrs.length) return '';

  const candidates = {
    'к-ть днів відтермінвання': true,
    'к-ть днів відтермінування': true,
    'кількість днів відтермінвання': true,
    'кількість днів відтермінування': true,
    'к-ть днів відстрочки': true,
    'днів відтермінування': true,
    'днів відтермінвання': true,
    'відтермінування': true
  };

  for (var i = 0; i < attrs.length; i++) {
    var attr = attrs[i] || {};
    var name = normalizeAttributeName(attr.name || attr.title || '');
    if (!candidates[name]) continue;

    var value = attr.value;
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'object') {
      value = value.name || value.displayName || value.value || '';
    }
    var num = Number(String(value).replace(',', '.'));
    return isFinite(num) ? num : normalizeCell(value);
  }

  return '';
}

function fetchCounterpartiesChunk(offset, limitOverride) {
  const query = buildQuery({
    limit: Math.max(1, Number(limitOverride || COUNTERPARTY_LIMIT)),
    offset: offset,
    // For client_tag_map refresh we only need tags and deferred-days attributes.
    expand: 'tags,attributes'
  });

  const url = getApiBase() + '/entity/counterparty?' + query;
  const data = apiGet(url);
  return data.rows || [];
}

function fetchAllCounterparties() {
  let offset = 0;
  let allRows = [];
  const throttleMs = throttleMsForClientTagMapRefresh_();

  while (true) {
    const rows = fetchCounterpartiesChunk(offset);
    if (!rows.length) break;

    allRows = allRows.concat(rows);

    if (rows.length < COUNTERPARTY_LIMIT) break;
    offset += COUNTERPARTY_LIMIT;
    if (throttleMs > 0) Utilities.sleep(throttleMs);
  }

  return allRows;
}

function fetchCounterpartyBalancesReportChunk(offset) {
  const query = buildQuery({
    limit: 1000,
    offset: offset
  });

  const url = getApiBase() + '/report/counterparty?' + query;
  const data = apiGet(url);
  return data.rows || [];
}

function fetchAllCounterpartyBalancesReportRows() {
  let offset = 0;
  let allRows = [];

  while (true) {
    const rows = fetchCounterpartyBalancesReportChunk(offset);
    if (!rows.length) break;

    allRows = allRows.concat(rows);

    if (rows.length < 1000) break;
    offset += 1000;
    Utilities.sleep(250);
  }

  return allRows;
}

function fetchProductStockChunk(offset) {
  const query = buildQuery({
    limit: 1000,
    offset: offset
  });

  const urls = [
    getApiBase() + '/report/stock/all?' + query
  ];

  for (var i = 0; i < urls.length; i++) {
    try {
      const data = apiGet(urls[i]);
      return data.rows || [];
    } catch (e) {
      // try next known stock-report shape if needed in the future
    }
  }

  throw new Error('Не вдалося отримати залишки товарів із MoySklad API');
}

function fetchAllProductStockRows() {
  let offset = 0;
  let allRows = [];

  while (true) {
    const rows = fetchProductStockChunk(offset);
    if (!rows.length) break;

    allRows = allRows.concat(rows);

    if (rows.length < 1000) break;
    offset += 1000;
    Utilities.sleep(250);
  }

  return allRows;
}

function extractAssortmentFromStockRow(stockRow) {
  return (
    stockRow && stockRow.assortment ||
    stockRow && stockRow.meta && stockRow.meta.assortment ||
    {}
  );
}

var PRODUCT_STOCK_SKU_CACHE_ = {};

function extractStockRowSku(stockRow, assortment) {
  var directSku = extractSku(assortment);
  if (directSku) return directSku;

  directSku = extractSku(stockRow);
  if (directSku) return directSku;

  var cacheKey =
    normalizeCell(safeGet(assortment, ['id'], '')) ||
    normalizeCell(safeGet(assortment, ['meta', 'href'], '')) ||
    normalizeCell(safeGet(stockRow, ['assortment', 'id'], '')) ||
    normalizeCell(safeGet(stockRow, ['assortment', 'meta', 'href'], ''));

  if (!cacheKey) return '';

  if (Object.prototype.hasOwnProperty.call(PRODUCT_STOCK_SKU_CACHE_, cacheKey)) {
    return PRODUCT_STOCK_SKU_CACHE_[cacheKey];
  }

  var sku = '';
  var href =
    safeGet(assortment, ['meta', 'href'], '') ||
    safeGet(stockRow, ['assortment', 'meta', 'href'], '');

  if (href) {
    try {
      var full = fetchEntityWithAttributes_(href);
      sku = extractSku(full);
    } catch (e) {
      Logger.log('extractStockRowSku full entity error: ' + e);
    }
  }

  PRODUCT_STOCK_SKU_CACHE_[cacheKey] = sku || '';
  return PRODUCT_STOCK_SKU_CACHE_[cacheKey];
}

function extractStockQtyFromStockRow(stockRow) {
  const candidates = [
    safeGet(stockRow, ['stock'], ''),
    safeGet(stockRow, ['quantity'], ''),
    safeGet(stockRow, ['stockByStore', '0', 'stock'], '')
  ];

  for (var i = 0; i < candidates.length; i++) {
    const value = Number(candidates[i]);
    if (isFinite(value)) return value;
  }
  return 0;
}

function extractReserveQtyFromStockRow(stockRow) {
  const candidates = [
    safeGet(stockRow, ['reserve'], ''),
    safeGet(stockRow, ['reserved'], '')
  ];

  for (var i = 0; i < candidates.length; i++) {
    const value = Number(candidates[i]);
    if (isFinite(value)) return value;
  }
  return 0;
}

function extractInTransitQtyFromStockRow(stockRow) {
  const candidates = [
    safeGet(stockRow, ['inTransit'], ''),
    safeGet(stockRow, ['transport'], '')
  ];

  for (var i = 0; i < candidates.length; i++) {
    const value = Number(candidates[i]);
    if (isFinite(value)) return value;
  }
  return 0;
}

function buildProductStockRows(stockRows) {
  const out = [];

  (stockRows || []).forEach(function(stockRow) {
    const assortment = extractAssortmentFromStockRow(stockRow);
    const sku = extractStockRowSku(stockRow, assortment);
    const stockQty = round2(extractStockQtyFromStockRow(stockRow));
    const reserveQty = round2(extractReserveQtyFromStockRow(stockRow));
    const inTransitQty = round2(extractInTransitQtyFromStockRow(stockRow));
    const availableQty = round2(stockQty - reserveQty + inTransitQty);
    const productName = normalizeCell(safeGet(assortment, ['name'], '') || safeGet(stockRow, ['name'], ''));

    if (!productName) return;
    if (stockQty <= 0) return;

    out.push([
      normalizeCell(safeGet(assortment, ['id'], '')),
      normalizeCell(safeGet(assortment, ['meta', 'href'], '')),
      sku,
      productName,
      extractBrand(assortment),
      extractCategory(assortment),
      extractProductGroup(assortment),
      stockQty,
      reserveQty,
      inTransitQty,
      availableQty,
      normalizeCell(safeGet(assortment, ['uom', 'name'], '')),
      nowText()
    ]);
  });

  return out.sort(function(a, b) {
    return String(a[3] || '').localeCompare(String(b[3] || ''), 'uk');
  });
}

function extractCounterpartyIdFromReportRow(reportRow) {
  const directId = normalizeCell(safeGet(reportRow, ['counterparty', 'id'], ''));
  if (directId) return directId;

  const href = normalizeCell(safeGet(reportRow, ['counterparty', 'meta', 'href'], ''));
  if (!href) return '';

  const parts = href.split('/').filter(Boolean);
  return normalizeCell(parts[parts.length - 1] || '');
}

function normalizeMoneyLikeValue(value) {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'object') {
    if (value.amount !== undefined && value.amount !== null && value.amount !== '') value = value.amount;
    else if (value.sum !== undefined && value.sum !== null && value.sum !== '') value = value.sum;
    else if (value.value !== undefined && value.value !== null && value.value !== '') value = value.value;
    else value = '';
  }

  const text = String(value).replace(/\s+/g, '').replace(',', '.').trim();
  if (!text) return '';

  const num = Number(text);
  if (!isFinite(num)) return '';

  if (/^-?\d+$/.test(text)) return round2(money(num));
  return round2(num);
}

function extractBalanceFromAccountsArray(accounts) {
  if (!Array.isArray(accounts) || !accounts.length) return '';

  for (var i = 0; i < accounts.length; i++) {
    var account = accounts[i] || {};
    var candidates = [
      account.balance,
      account.accountsReceivable,
      account.accountsPayable,
      account.sum,
      safeGet(account, ['accountCurrency', 'balance'], '')
    ];

    for (var j = 0; j < candidates.length; j++) {
      var normalized = normalizeMoneyLikeValue(candidates[j]);
      if (normalized !== '') return normalized;
    }
  }

  return '';
}

function fetchAccountDetailByMeta(accountMeta) {
  const href =
    safeGet(accountMeta, ['meta', 'href'], '') ||
    safeGet(accountMeta, ['href'], '') ||
    '';

  const cleanHref = normalizeCell(href);
  if (!cleanHref) return null;

  try {
    return apiGet(cleanHref);
  } catch (e) {
    return null;
  }
}

function extractBalanceFromAccountDetail(accountDetail) {
  if (!accountDetail) return '';

  const candidates = [
    safeGet(accountDetail, ['balance'], ''),
    safeGet(accountDetail, ['sum'], ''),
    safeGet(accountDetail, ['accountsReceivable'], ''),
    safeGet(accountDetail, ['accountsPayable'], ''),
    safeGet(accountDetail, ['state', 'balance'], ''),
    safeGet(accountDetail, ['available'], ''),
    safeGet(accountDetail, ['credit'], ''),
    safeGet(accountDetail, ['debit'], '')
  ];

  for (var i = 0; i < candidates.length; i++) {
    var normalized = normalizeMoneyLikeValue(candidates[i]);
    if (normalized !== '') return normalized;
  }

  return '';
}

function resolveBalanceViaAccountRefs(accounts) {
  if (!Array.isArray(accounts) || !accounts.length) return '';

  for (var i = 0; i < accounts.length; i++) {
    var detail = fetchAccountDetailByMeta(accounts[i]);
    var balance = extractBalanceFromAccountDetail(detail);
    if (balance !== '') return balance;
  }

  return '';
}

function extractBalanceFromCounterparty(counterparty) {
  const directCandidates = [
    safeGet(counterparty, ['accountsReceivable'], ''),
    safeGet(counterparty, ['accountsPayable'], ''),
    safeGet(counterparty, ['balance'], ''),
    safeGet(counterparty, ['debt'], ''),
    safeGet(counterparty, ['state', 'balance'], ''),
    safeGet(counterparty, ['agent', 'balance'], '')
  ];

  for (var i = 0; i < directCandidates.length; i++) {
    var normalized = normalizeMoneyLikeValue(directCandidates[i]);
    if (normalized !== '') return normalized;
  }

  const attrs = counterparty && counterparty.attributes;
  if (Array.isArray(attrs) && attrs.length) {
    const balanceAttrNames = {
      'баланс': true,
      'баланс (нам должны)': true,
      'нам должны': true,
      'заборгованість': true,
      'долг': true,
      'debt': true,
      'balance': true
    };

    for (var k = 0; k < attrs.length; k++) {
      var attr = attrs[k] || {};
      var attrName = normalizeAttributeName(attr.name || attr.title || '');
      if (!balanceAttrNames[attrName]) continue;
      var attrValue = normalizeMoneyLikeValue(attr.value);
      if (attrValue !== '') return attrValue;
    }
  }

  return '';
}

function fetchCounterpartyDetailById(counterpartyId) {
  const id = normalizeCell(counterpartyId);
  if (!id) return null;

  const urls = [
    getApiBase() + '/entity/counterparty/' + encodeURIComponent(id),
    getApiBase() + '/entity/counterparty/' + encodeURIComponent(id) + '?' + buildQuery({
      expand: 'accounts,accounts.accountCurrency,attributes,tags,groups'
    })
  ];

  for (var i = 0; i < urls.length; i++) {
    try {
      return apiGet(urls[i]);
    } catch (e) {
      // fallback to next url shape
    }
  }

  return null;
}

function resolveCounterpartyBalance(counterparty) {
  var balance = extractBalanceFromCounterparty(counterparty);
  if (balance !== '') return balance;

  balance = extractBalanceFromAccountsArray(counterparty && counterparty.accounts);
  if (balance !== '') return balance;

  balance = resolveBalanceViaAccountRefs(counterparty && counterparty.accounts);
  if (balance !== '') return balance;

  var counterpartyId = normalizeCell(counterparty && counterparty.id);
  if (!counterpartyId) return '';

  var detail = fetchCounterpartyDetailById(counterpartyId);
  if (!detail) return '';

  balance = extractBalanceFromCounterparty(detail);
  if (balance !== '') return balance;

  balance = extractBalanceFromAccountsArray(detail && detail.accounts);
  if (balance !== '') return balance;

  balance = resolveBalanceViaAccountRefs(detail && detail.accounts);
  if (balance !== '') return balance;

  return '';
}

function buildClientTagMapRows(counterparties) {
  const out = [];
  const batchUpdatedAt = nowText();

  (counterparties || []).forEach(function(counterparty) {
    const client = normalizeCell(counterparty && counterparty.name);
    const counterpartyId = normalizeCell(counterparty && counterparty.id);
    const tagNames = extractTagNamesFromCounterparty(counterparty);
    const normalizedTagNames = tagNames.map(normalizeTagName).filter(Boolean);
    const managerTag = resolveManagerTagFromTags(normalizedTagNames);
    const excludeTags = extractExcludeTags(normalizedTagNames, managerTag);

    out.push([
      counterpartyId,
      client,
      managerTag,
      excludeTags.join(', '),
      normalizedTagNames.join(', '),
      batchUpdatedAt
    ]);
  });

  return out.sort(function(a, b) {
    return String(a[1] || '').localeCompare(String(b[1] || ''), 'uk');
  });
}

function buildCounterpartyDeferredDaysLookup(counterparties) {
  const lookup = {
    by_id: {},
    by_client: {}
  };

  (Array.isArray(counterparties) ? counterparties : []).forEach(function(counterparty) {
    const counterpartyId = normalizeCell(counterparty && counterparty.id);
    const client = normalizeCell(counterparty && counterparty.name);
    const deferDays = extractDeferredDaysFromCounterparty(counterparty);
    const normalizedDefer = deferDays === '' ? '' : Number(deferDays);
    const value = normalizedDefer === '' || !isFinite(normalizedDefer) ? '' : normalizedDefer;

    if (counterpartyId) lookup.by_id[counterpartyId] = value;
    if (client) lookup.by_client[client] = value;
  });

  return lookup;
}

function buildClientTagMetaLookup() {
  const tagMap = getClientTagMap();
  const lookup = {
    by_id: {},
    by_client: {}
  };

  Object.keys(tagMap).forEach(function(client) {
    const item = tagMap[client] || {};
    const payload = {
      manager_tag: normalizeTagName(item.manager_tag),
      exclude_tags: normalizeCell(item.exclude_tags),
      all_tags: normalizeCell(item.all_tags)
    };

    if (normalizeCell(item.counterparty_id)) {
      lookup.by_id[normalizeCell(item.counterparty_id)] = payload;
    }
    lookup.by_client[normalizeCell(client)] = payload;
  });

  return lookup;
}

function buildClientBalanceRows(reportRows, deferredLookup, tagMetaLookup) {
  const out = [];
  const lookup = deferredLookup || { by_id: {}, by_client: {} };
  const tagsLookup = tagMetaLookup || { by_id: {}, by_client: {} };

  (reportRows || []).forEach(function(reportRow) {
    const client = normalizeCell(safeGet(reportRow, ['counterparty', 'name'], ''));
    const counterpartyId = extractCounterpartyIdFromReportRow(reportRow);
    const balance = round2(money(safeGet(reportRow, ['balance'], 0)));
    const deferDaysById = Object.prototype.hasOwnProperty.call(lookup.by_id, counterpartyId) ? lookup.by_id[counterpartyId] : '';
    const deferDaysByClient = Object.prototype.hasOwnProperty.call(lookup.by_client, client) ? lookup.by_client[client] : '';
    const deferDays = deferDaysById !== '' ? deferDaysById : deferDaysByClient;
    const tagMetaById = Object.prototype.hasOwnProperty.call(tagsLookup.by_id, counterpartyId) ? tagsLookup.by_id[counterpartyId] : null;
    const tagMetaByClient = Object.prototype.hasOwnProperty.call(tagsLookup.by_client, client) ? tagsLookup.by_client[client] : null;
    const tagMeta = tagMetaById || tagMetaByClient || {};

    out.push([
      counterpartyId,
      client,
      balance,
      normalizeTagName(tagMeta.manager_tag),
      normalizeCell(tagMeta.exclude_tags),
      normalizeCell(tagMeta.all_tags),
      nowText(),
      deferDays
    ]);
  });

  return out
    .filter(function(row) {
      return normalizeCell(row[1]);
    })
    .sort(function(a, b) {
      return String(a[1] || '').localeCompare(String(b[1] || ''), 'uk');
    });
}

function getClientBalancesReportRowsPart(partIndex, totalParts) {
  var normalizedPartIndex = Math.max(1, Number(partIndex || 1));
  var normalizedTotalParts = Math.max(1, Number(totalParts || 1));

  var reportRows = fetchAllCounterpartyBalancesReportRows()
    .slice()
    .sort(function(a, b) {
      return normalizeCell(safeGet(a, ['counterparty', 'name'], '')).localeCompare(
        normalizeCell(safeGet(b, ['counterparty', 'name'], '')),
        'uk'
      );
    });

  if (normalizedTotalParts === 1) return reportRows;

  var total = reportRows.length;
  var chunkSize = Math.ceil(total / normalizedTotalParts);
  var start = (normalizedPartIndex - 1) * chunkSize;
  var end = Math.min(start + chunkSize, total);

  return reportRows.slice(start, end);
}


function ensureClientTagMapSheet() {
  const ss = getSpreadsheet();
  const report = ensureSystemSheet(ss, SHEET_CLIENT_TAG_MAP, CLIENT_TAG_MAP_HEADERS);
  Logger.log('ensureClientTagMapSheet -> ' + JSON.stringify(report));
  return report;
}

function ensureClientBalancesSheet() {
  const ss = getSpreadsheet();
  const report = ensureSystemSheet(ss, SHEET_CLIENT_BALANCES, CLIENT_BALANCES_HEADERS);
  Logger.log('ensureClientBalancesSheet -> ' + JSON.stringify(report));
  return report;
}

function ensureClientBalancesDebugSheet() {
  const ss = getSpreadsheet();
  const report = ensureSystemSheet(ss, SHEET_CLIENT_BALANCES_DEBUG, CLIENT_BALANCES_DEBUG_HEADERS);
  Logger.log('ensureClientBalancesDebugSheet -> ' + JSON.stringify(report));
  return report;
}

function ensureClientBalancesAccountsDebugSheet() {
  const ss = getSpreadsheet();
  const report = ensureSystemSheet(ss, SHEET_CLIENT_BALANCES_ACCOUNTS_DEBUG, CLIENT_BALANCES_ACCOUNTS_DEBUG_HEADERS);
  Logger.log('ensureClientBalancesAccountsDebugSheet -> ' + JSON.stringify(report));
  return report;
}

function ensureProductStockSheet() {
  const ss = getSpreadsheet();
  const report = ensureSystemSheet(ss, SHEET_PRODUCT_STOCK, PRODUCT_STOCK_HEADERS);
  Logger.log('ensureProductStockSheet -> ' + JSON.stringify(report));
  return report;
}

function removeTriggersByHandler(handlerName) {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === handlerName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function getRefreshLoopTasks_() {
  return [
    { key: 'monthly_repair', handler: 'monthlyRepairNow', runLabel: 'RUN_06_monthlyRepairNow' },
    { key: 'client_balances', handler: 'refreshClientBalancesNow', runLabel: 'RUN_09_refreshClientBalancesNow' },
    { key: 'product_stock', handler: 'refreshProductStockNow', runLabel: 'RUN_10_refreshProductStockNow' }
  ];
}

function getRefreshLoopMetaKey_(suffix) {
  return REFRESH_LOOP_META_PREFIX + suffix;
}

function getRefreshLoopIndex_() {
  var raw = Number(getSystemMetaValue(getRefreshLoopMetaKey_('index')));
  if (!isFinite(raw) || raw < 0) return 0;
  var tasks = getRefreshLoopTasks_();
  if (!tasks.length) return 0;
  return raw % tasks.length;
}

function getRefreshLoopRetryCount_() {
  var raw = Number(getSystemMetaValue(getRefreshLoopMetaKey_('retry_count')));
  if (!isFinite(raw) || raw < 0) return 0;
  return raw;
}

function setRefreshLoopCurrentTaskState_(taskRunLabel, startedAt) {
  setSystemMetaValue(getRefreshLoopMetaKey_('current_task'), normalizeCell(taskRunLabel));
  setSystemMetaValue(getRefreshLoopMetaKey_('current_started_at'), normalizeCell(startedAt));
}

function clearRefreshLoopCurrentTaskState_() {
  setSystemMetaValue(getRefreshLoopMetaKey_('current_task'), '');
  setSystemMetaValue(getRefreshLoopMetaKey_('current_started_at'), '');
}

function parseRefreshLoopDateMs_(value) {
  var text = normalizeCell(value);
  if (!text) return 0;

  var parsed = new Date(text.replace(' ', 'T'));
  var time = parsed.getTime();
  return isFinite(time) ? time : 0;
}

function healStaleRefreshLoopCurrentTask_() {
  var currentTask = normalizeCell(getSystemMetaValue(getRefreshLoopMetaKey_('current_task')));
  var currentStartedAt = normalizeCell(getSystemMetaValue(getRefreshLoopMetaKey_('current_started_at')));

  if (!currentTask || !currentStartedAt) return false;

  var startedAtMs = parseRefreshLoopDateMs_(currentStartedAt);
  if (!startedAtMs) return false;
  if (Date.now() - startedAtMs < REFRESH_LOOP_STALE_TASK_MS) return false;

  clearRefreshLoopCurrentTaskState_();
  setSystemMetaValue(getRefreshLoopMetaKey_('last_error'), 'Автоочистка завислої loop-задачі: ' + currentTask);

  if (normalizeCell(getSystemMetaValue(getRefreshLoopMetaKey_('last_status'))) !== 'ok') {
    setSystemMetaValue(getRefreshLoopMetaKey_('last_status'), 'stale_cleared');
  }

  return true;
}

function setRefreshLoopState_(index, retryCount, payload) {
  setSystemMetaValue(getRefreshLoopMetaKey_('index'), String(Math.max(0, Number(index) || 0)));
  setSystemMetaValue(getRefreshLoopMetaKey_('retry_count'), String(Math.max(0, Number(retryCount) || 0)));

  var data = payload || {};
  if (Object.prototype.hasOwnProperty.call(data, 'last_task')) {
    setSystemMetaValue(getRefreshLoopMetaKey_('last_task'), normalizeCell(data.last_task));
  }
  if (Object.prototype.hasOwnProperty.call(data, 'last_status')) {
    setSystemMetaValue(getRefreshLoopMetaKey_('last_status'), normalizeCell(data.last_status));
  }
  if (Object.prototype.hasOwnProperty.call(data, 'last_success_at')) {
    setSystemMetaValue(getRefreshLoopMetaKey_('last_success_at'), normalizeCell(data.last_success_at));
  }
  if (Object.prototype.hasOwnProperty.call(data, 'last_error')) {
    setSystemMetaValue(getRefreshLoopMetaKey_('last_error'), normalizeCell(data.last_error));
  }
}

function getRefreshLoopState() {
  healStaleRefreshLoopCurrentTask_();
  var tasks = getRefreshLoopTasks_();
  var index = getRefreshLoopIndex_();
  var nextTask = tasks[index] || null;
  return {
    ok: true,
    tasks: tasks.map(function(task) { return task.runLabel; }),
    current_index: index,
    next_task: nextTask ? nextTask.runLabel : '',
    retry_count: getRefreshLoopRetryCount_(),
    current_task: getSystemMetaValue(getRefreshLoopMetaKey_('current_task')),
    current_started_at: getSystemMetaValue(getRefreshLoopMetaKey_('current_started_at')),
    last_task: getSystemMetaValue(getRefreshLoopMetaKey_('last_task')),
    last_status: getSystemMetaValue(getRefreshLoopMetaKey_('last_status')),
    last_success_at: getSystemMetaValue(getRefreshLoopMetaKey_('last_success_at')),
    last_error: getSystemMetaValue(getRefreshLoopMetaKey_('last_error'))
  };
}

function resetRefreshLoopState() {
  clearRefreshLoopCurrentTaskState_();
  setRefreshLoopState_(0, 0, {
    last_task: '',
    last_status: 'reset',
    last_success_at: '',
    last_error: ''
  });
  return getRefreshLoopState();
}

function installRefreshLoopTrigger() {
  removeTriggersByHandler(REFRESH_LOOP_HANDLER);

  ScriptApp.newTrigger(REFRESH_LOOP_HANDLER)
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('installRefreshLoopTrigger -> installed minute trigger for ' + REFRESH_LOOP_HANDLER);

  return {
    ok: true,
    handler: REFRESH_LOOP_HANDLER,
    every_minutes: 1,
    tasks: getRefreshLoopTasks_().map(function(task) { return task.runLabel; })
  };
}

function startRefreshLoop() {
  resetRefreshLoopState();
  var triggerInfo = installRefreshLoopTrigger();
  var firstTick = schedulerTick_();

  return {
    ok: true,
    trigger: triggerInfo,
    first_tick: firstTick,
    state: getRefreshLoopState()
  };
}

function stopRefreshLoop() {
  removeTriggersByHandler(REFRESH_LOOP_HANDLER);
  clearRefreshLoopCurrentTaskState_();
  setRefreshLoopState_(getRefreshLoopIndex_(), 0, {
    last_status: 'stopped',
    last_error: ''
  });
  return {
    ok: true,
    handler: REFRESH_LOOP_HANDLER,
    stopped: true
  };
}

function runRefreshLoopTask_(task) {
  var handler = normalizeCell(task && task.handler);
  if (handler === 'refreshClientTagMapNow') return refreshClientTagMapNow();
  if (handler === 'monthlyRepairNow') return monthlyRepairNow();
  if (handler === 'refreshClientBalancesNow') return refreshClientBalancesNow();
  if (handler === 'refreshProductStockNow') return refreshProductStockNow();
  throw new Error('Невідомий handler refresh loop: ' + handler);
}

function schedulerTick_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return {
      ok: false,
      skipped: true,
      reason: 'locked'
    };
  }

  try {
    ensureSystemMetaSheet();

    var tasks = getRefreshLoopTasks_();
    if (!tasks.length) {
      return { ok: false, error: 'Порожній список задач refresh loop' };
    }

    var index = getRefreshLoopIndex_();
    var retryCount = getRefreshLoopRetryCount_();
    var task = tasks[index] || tasks[0];
    var startedAt = nowText();
    setRefreshLoopCurrentTaskState_(task.runLabel, startedAt);

    try {
      var result = runRefreshLoopTask_(task);
      var nextIndex = (index + 1) % tasks.length;
      var cycleInfo = null;
      if (nextIndex === 0) {
        cycleInfo = markRefreshLoopCycleCompleted_();
      }
      clearRefreshLoopCurrentTaskState_();
      setRefreshLoopState_(nextIndex, 0, {
        last_task: task.runLabel,
        last_status: 'ok',
        last_success_at: startedAt,
        last_error: ''
      });

      return {
        ok: true,
        task: task.runLabel,
        next_task: tasks[nextIndex].runLabel,
        retry_count: 0,
        cycle_completed: !!cycleInfo,
        cycle_counter: cycleInfo ? cycleInfo.cycle_counter : Number(getSystemMetaValue(REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0),
        result: result || null
      };
    } catch (err) {
      var errorMessage = String(err && err.message ? err.message : err);
      if (retryCount < 1) {
        clearRefreshLoopCurrentTaskState_();
        setRefreshLoopState_(index, retryCount + 1, {
          last_task: task.runLabel,
          last_status: 'retry',
          last_error: errorMessage
        });
        return {
          ok: false,
          task: task.runLabel,
          retry_scheduled: true,
          retry_count: retryCount + 1,
          error: errorMessage
        };
      }

      var fallbackNextIndex = (index + 1) % tasks.length;
      clearRefreshLoopCurrentTaskState_();
      setRefreshLoopState_(fallbackNextIndex, 0, {
        last_task: task.runLabel,
        last_status: 'failed_skip',
        last_error: errorMessage
      });

      return {
        ok: false,
        task: task.runLabel,
        retry_scheduled: false,
        skipped_to_next: true,
        next_task: tasks[fallbackNextIndex].runLabel,
        error: errorMessage
      };
    }
  } finally {
    lock.releaseLock();
  }
}

function installClientTagMapDailyTrigger() {
  removeTriggersByHandler('refreshClientTagMapNow');
  clearClientTagMapContinuationTrigger_();
  return {
    ok: false,
    deprecated: true,
    message: 'Автотригер тегів вимкнено. Запускайте вручну RUN_07_refreshClientTagMapPart1Now і RUN_08_refreshClientTagMapPart2Now.'
  };
}

function installProductStockDailyTrigger() {
  removeTriggersByHandler('refreshProductStockNow');

  ScriptApp.newTrigger('refreshProductStockNow')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  Logger.log('installProductStockDailyTrigger -> installed daily trigger for refreshProductStockNow atHour=6');

  return {
    ok: true,
    handler: 'refreshProductStockNow',
    every_days: 1,
    at_hour: 6
  };
}

function getClientTagMapRefreshMetaKey_(suffix) {
  return CLIENT_TAG_MAP_REFRESH_META_PREFIX + suffix;
}

function clearClientTagMapContinuationTrigger_() {
  removeTriggersByHandler(CLIENT_TAG_MAP_REFRESH_CONTINUATION_HANDLER);
}

function scheduleClientTagMapContinuationTrigger_() {
  clearClientTagMapContinuationTrigger_();
  ScriptApp.newTrigger(CLIENT_TAG_MAP_REFRESH_CONTINUATION_HANDLER)
    .timeBased()
    .after(10 * 1000)
    .create();
}

function getClientTagMapRefreshState_() {
  return {
    ok: true,
    active: normalizeCell(getSystemMetaValue(getClientTagMapRefreshMetaKey_('active'))) === '1',
    offset: Number(getSystemMetaValue(getClientTagMapRefreshMetaKey_('offset')) || 0),
    chunk_limit: Number(getSystemMetaValue(getClientTagMapRefreshMetaKey_('chunk_limit')) || CLIENT_TAG_MAP_REFRESH_LIMIT),
    rows_written: Number(getSystemMetaValue(getClientTagMapRefreshMetaKey_('rows_written')) || 0),
    chunks_completed: Number(getSystemMetaValue(getClientTagMapRefreshMetaKey_('chunks_completed')) || 0),
    started_at: getSystemMetaValue(getClientTagMapRefreshMetaKey_('started_at')),
    last_batch_at: getSystemMetaValue(getClientTagMapRefreshMetaKey_('last_batch_at')),
    completed_at: getSystemMetaValue(getClientTagMapRefreshMetaKey_('completed_at')),
    last_error: getSystemMetaValue(getClientTagMapRefreshMetaKey_('last_error'))
  };
}

function setClientTagMapRefreshState_(patch) {
  var data = patch || {};
  Object.keys(data).forEach(function(key) {
    setSystemMetaValue(getClientTagMapRefreshMetaKey_(key), String(data[key] == null ? '' : data[key]));
  });
}

function resetClientTagMapRefreshState_() {
  clearClientTagMapContinuationTrigger_();
  setClientTagMapRefreshState_({
    active: '',
    offset: '',
    chunk_limit: '',
    rows_written: '',
    chunks_completed: '',
    started_at: '',
    last_batch_at: '',
    completed_at: '',
    last_error: ''
  });
  return getClientTagMapRefreshState_();
}


function resetProjectStateSafe() {
  ensureSystemMetaSheet();

  var deletedHandlers = [];
  [
    REFRESH_LOOP_HANDLER,
    'refreshClientTagMapNow',
    CLIENT_TAG_MAP_REFRESH_CONTINUATION_HANDLER,
    'refreshProductStockNow'
  ].forEach(function(handler) {
    removeTriggersByHandler(handler);
    deletedHandlers.push(handler);
  });

  resetRefreshLoopState();
  resetClientTagMapRefreshState_();
  clearRefreshLoopCurrentTaskState_();
  clearClientTagMapContinuationTrigger_();

  var oldSnapshotFileId = normalizeCell(getSystemMetaValue(DASHBOARD_SNAPSHOT_FILE_ID_META_KEY));
  if (oldSnapshotFileId) {
    try {
      DriveApp.getFileById(oldSnapshotFileId).setTrashed(true);
    } catch (e) {}
  }

  setSystemMetaValue(REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY, '');
  setSystemMetaValue(REFRESH_LOOP_CYCLE_COUNTER_KEY, '0');
  setSystemMetaValue(DASHBOARD_SNAPSHOT_FILE_ID_META_KEY, '');
  setSystemMetaValue(DASHBOARD_SNAPSHOT_STATE_META_KEY, '');
  setSystemMetaValue(DASHBOARD_SNAPSHOT_BUILT_AT_META_KEY, '');
  setSystemMetaValue(DASHBOARD_SNAPSHOT_INVALIDATED_AT_META_KEY, '');
  setSystemMetaValue(DASHBOARD_SNAPSHOT_LAST_ERROR_META_KEY, '');

  return {
    ok: true,
    message: 'Safe project state reset completed',
    deleted_trigger_handlers: deletedHandlers,
    refresh_loop_state: getRefreshLoopState(),
    client_tag_map_refresh_state: getClientTagMapRefreshState_(),
    snapshot_file_trashed: !!oldSnapshotFileId,
    cycle_counter: Number(getSystemMetaValue(REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0),
    cycle_completed_at: getSystemMetaValue(REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY),
    snapshot_state: getSystemMetaValue(DASHBOARD_SNAPSHOT_STATE_META_KEY)
  };
}

function initializeClientTagMapRefreshSheet_() {
  ensureClientTagRulesSheet();
  ensureClientTagMapSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_CLIENT_TAG_MAP);
  ensureHeadersForSheet(sheet, CLIENT_TAG_MAP_HEADERS);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, CLIENT_TAG_MAP_HEADERS.length).setValues([CLIENT_TAG_MAP_HEADERS]);
  sheet.setFrozenRows(1);
  return sheet;
}

function appendClientTagMapRows_(sheet, rows) {
  if (!sheet || !rows || !rows.length) return 0;
  const startRow = Math.max(2, sheet.getLastRow() + 1);
  sheet.getRange(startRow, 1, rows.length, CLIENT_TAG_MAP_HEADERS.length).setValues(rows);
  return rows.length;
}

function refreshClientTagMapManualPart_(partIndex) {
  const numericPart = Math.max(1, Number(partIndex || 1));
  if (numericPart !== 1 && numericPart !== 2) {
    throw new Error('client_tag_map manual refresh підтримує тільки part 1 або part 2');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return {
      ok: false,
      skipped: true,
      reason: 'locked',
      part: numericPart
    };
  }

  try {
    ensureClientTagRulesSheet();
    ensureClientTagMapSheet();
    clearClientTagMapContinuationTrigger_();

    const startedAt = nowText();
    const stateBeforePart = getClientTagMapRefreshState_();
    const offset = numericPart === 1
      ? 0
      : Math.max(CLIENT_TAG_MAP_MANUAL_PART_LIMIT, Number(stateBeforePart.offset || CLIENT_TAG_MAP_MANUAL_PART_LIMIT));
    const sheet = numericPart === 1
      ? initializeClientTagMapRefreshSheet_()
      : getSpreadsheet().getSheetByName(SHEET_CLIENT_TAG_MAP);

    if (!sheet) {
      throw new Error('Не вдалося отримати аркуш client_tag_map');
    }

    if (numericPart === 2 && sheet.getLastRow() < 1) {
      sheet.getRange(1, 1, 1, CLIENT_TAG_MAP_HEADERS.length).setValues([CLIENT_TAG_MAP_HEADERS]);
      sheet.setFrozenRows(1);
    }

    let currentOffset = offset;
    let counterpartiesProcessed = 0;
    let rowsWritten = 0;
    let chunksCompleted = Math.max(0, Number(stateBeforePart.chunks_completed || 0));
    let lastChunkLength = 0;

    while (true) {
      const counterparties = fetchCounterpartiesChunk(currentOffset, CLIENT_TAG_MAP_MANUAL_PART_LIMIT);
      lastChunkLength = counterparties.length;
      if (!counterparties.length) break;

      const rows = buildClientTagMapRows(counterparties);
      rowsWritten += appendClientTagMapRows_(sheet, rows);
      counterpartiesProcessed += counterparties.length;
      currentOffset += counterparties.length;
      chunksCompleted += 1;

      setClientTagMapRefreshState_({
        active: numericPart === 2 ? '' : '1',
        offset: currentOffset,
        chunk_limit: CLIENT_TAG_MAP_MANUAL_PART_LIMIT,
        rows_written: Math.max(0, Number(stateBeforePart.rows_written || 0)) + rowsWritten,
        chunks_completed: chunksCompleted,
        started_at: numericPart === 1 ? startedAt : (stateBeforePart.started_at || startedAt),
        last_batch_at: nowText(),
        completed_at: '',
        last_error: ''
      });

      if (numericPart === 1) break;
      if (counterparties.length < CLIENT_TAG_MAP_MANUAL_PART_LIMIT) break;
    }

    const completedAt = nowText();
    const shouldFinalize = numericPart === 2 || lastChunkLength < CLIENT_TAG_MAP_MANUAL_PART_LIMIT;

    sheet.setFrozenRows(1);

    setClientTagMapRefreshState_({
      active: shouldFinalize ? '' : '1',
      offset: currentOffset,
      chunk_limit: CLIENT_TAG_MAP_MANUAL_PART_LIMIT,
      rows_written: Math.max(0, Number(stateBeforePart.rows_written || 0)) + rowsWritten,
      chunks_completed: chunksCompleted,
      started_at: numericPart === 1 ? startedAt : (stateBeforePart.started_at || startedAt),
      last_batch_at: completedAt,
      completed_at: shouldFinalize ? completedAt : '',
      last_error: ''
    });

    if (shouldFinalize) {
      setSystemMetaValue('client_tag_map_last_refresh', completedAt);
      markDashboardServerSnapshotStale_('client_tag_map_manual_parts_refreshed');
    }

    return {
      ok: true,
      part: numericPart,
      total_parts: 2,
      offset_start: offset,
      offset_end: currentOffset,
      limit: CLIENT_TAG_MAP_MANUAL_PART_LIMIT,
      counterparties_processed: counterpartiesProcessed,
      rows_written: rowsWritten,
      finalized: shouldFinalize,
      started_at: startedAt,
      completed_at: completedAt
    };
  } finally {
    lock.releaseLock();
  }
}

function refreshClientTagMapPart1Now() {
  resetClientTagMapRefreshState_();
  return refreshClientTagMapManualPart_(1);
}

function refreshClientTagMapPart2Now() {
  return refreshClientTagMapManualPart_(2);
}

function processClientTagMapRefreshBatches_(options) {
  const config = options || {};
  const startedAtMs = Number(config.started_at_ms || Date.now());
  const deadlineMs = startedAtMs + CLIENT_TAG_MAP_REFRESH_EXECUTION_MS;
  const chunkLimit = Math.max(50, Number(config.chunk_limit || CLIENT_TAG_MAP_REFRESH_LIMIT));
  const sheet = getSpreadsheet().getSheetByName(SHEET_CLIENT_TAG_MAP) || initializeClientTagMapRefreshSheet_();
  let state = getClientTagMapRefreshState_();
  let offset = Math.max(0, Number(state.offset || 0));
  let rowsWritten = Math.max(0, Number(state.rows_written || 0));
  let chunksCompleted = Math.max(0, Number(state.chunks_completed || 0));

  while (Date.now() < deadlineMs) {
    const counterparties = fetchCounterpartiesChunk(offset, chunkLimit);
    if (!counterparties.length) {
      const completedAt = nowText();
      sheet.setFrozenRows(1);
      setSystemMetaValue('client_tag_map_last_refresh', completedAt);
      markDashboardServerSnapshotStale_('client_tag_map_refreshed');
      clearClientTagMapContinuationTrigger_();
      setClientTagMapRefreshState_({
        active: '',
        offset: offset,
        chunk_limit: chunkLimit,
        rows_written: rowsWritten,
        chunks_completed: chunksCompleted,
        last_batch_at: completedAt,
        completed_at: completedAt,
        last_error: ''
      });
      return {
        ok: true,
        completed: true,
        chunk_limit: chunkLimit,
        counterparties_processed: offset,
        rows_written: rowsWritten,
        chunks_completed: chunksCompleted
      };
    }

    const rows = buildClientTagMapRows(counterparties);
    rowsWritten += appendClientTagMapRows_(sheet, rows);
    offset += counterparties.length;
    chunksCompleted += 1;

    setClientTagMapRefreshState_({
      active: '1',
      offset: offset,
      chunk_limit: chunkLimit,
      rows_written: rowsWritten,
      chunks_completed: chunksCompleted,
      last_batch_at: nowText(),
      completed_at: '',
      last_error: ''
    });

    if (counterparties.length < chunkLimit) {
      const completedAt = nowText();
      sheet.setFrozenRows(1);
      setSystemMetaValue('client_tag_map_last_refresh', completedAt);
      markDashboardServerSnapshotStale_('client_tag_map_refreshed');
      clearClientTagMapContinuationTrigger_();
      setClientTagMapRefreshState_({
        active: '',
        offset: offset,
        chunk_limit: chunkLimit,
        rows_written: rowsWritten,
        chunks_completed: chunksCompleted,
        last_batch_at: completedAt,
        completed_at: completedAt,
        last_error: ''
      });
      return {
        ok: true,
        completed: true,
        chunk_limit: chunkLimit,
        counterparties_processed: offset,
        rows_written: rowsWritten,
        chunks_completed: chunksCompleted
      };
    }
  }

  scheduleClientTagMapContinuationTrigger_();
  setClientTagMapRefreshState_({
    active: '1',
    offset: offset,
    chunk_limit: chunkLimit,
    rows_written: rowsWritten,
    chunks_completed: chunksCompleted,
    last_batch_at: nowText(),
    completed_at: '',
    last_error: ''
  });

  return {
    ok: true,
    completed: false,
    continuation_scheduled: true,
    chunk_limit: chunkLimit,
    counterparties_processed: offset,
    rows_written: rowsWritten,
    chunks_completed: chunksCompleted
  };
}

function continueClientTagMapRefresh_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return {
      ok: false,
      skipped: true,
      reason: 'locked'
    };
  }

  try {
  const state = getClientTagMapRefreshState_();
  if (!state.active) {
    clearClientTagMapContinuationTrigger_();
    return {
      ok: true,
      skipped: true,
      reason: 'inactive'
    };
  }

  try {
    const result = processClientTagMapRefreshBatches_({
      started_at_ms: Date.now(),
      chunk_limit: state.chunk_limit || CLIENT_TAG_MAP_REFRESH_LIMIT
    });
    Logger.log('continueClientTagMapRefresh_ -> %s', JSON.stringify(result));
    return result;
  } catch (err) {
    const errorMessage = String(err && err.message ? err.message : err);
    setClientTagMapRefreshState_({
      active: '',
      last_error: errorMessage,
      last_batch_at: nowText()
    });
    clearClientTagMapContinuationTrigger_();
    throw err;
  }
  } finally {
    lock.releaseLock();
  }
}

function refreshClientTagMapNow() {
  return {
    ok: false,
    deprecated: true,
    message: 'Теги тепер оновлюються вручну у 2 частини: спочатку RUN_07_refreshClientTagMapPart1Now, потім RUN_08_refreshClientTagMapPart2Now.'
  };
}

function throttleMsForClientTagMapRefresh_() {
  return 0;
}

function refreshProductStockNow() {
  ensureProductStockSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_PRODUCT_STOCK);
  ensureExactHeaders(sheet, PRODUCT_STOCK_HEADERS);
  applySpecialSheetFormats(sheet);

  const stockRows = fetchAllProductStockRows();
  const rows = buildProductStockRows(stockRows);

  sheet.clearContents();
  sheet.getRange(1, 1, 1, PRODUCT_STOCK_HEADERS.length).setValues([PRODUCT_STOCK_HEADERS]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, PRODUCT_STOCK_HEADERS.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
  setSystemMetaValue('product_stock_last_refresh', nowText());
  markDashboardServerSnapshotStale_('product_stock_refreshed');
  Logger.log('refreshProductStockNow -> source_rows=' + stockRows.length + ', rows_written=' + rows.length);

  return {
    ok: true,
    source_rows_total: stockRows.length,
    rows_written: rows.length
  };
}

function refreshClientBalancesNow() {
  ensureClientBalancesSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_CLIENT_BALANCES);
  ensureExactHeaders(sheet, CLIENT_BALANCES_HEADERS);

  const counterparties = fetchAllCounterparties();
  const deferredLookup = buildCounterpartyDeferredDaysLookup(counterparties);
  const tagMetaLookup = buildClientTagMetaLookup();
  const reportRows = getClientBalancesReportRowsPart(1, 1);
  const rows = buildClientBalanceRows(reportRows, deferredLookup, tagMetaLookup);

  sheet.clearContents();
  sheet.getRange(1, 1, 1, CLIENT_BALANCES_HEADERS.length).setValues([CLIENT_BALANCES_HEADERS]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, CLIENT_BALANCES_HEADERS.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, CLIENT_BALANCES_HEADERS.length);
  setSystemMetaValue('client_balances_last_refresh', nowText());
  markDashboardServerSnapshotStale_('client_balances_refreshed');
  Logger.log('refreshClientBalancesNow -> report_rows=' + reportRows.length + ', counterparties=' + counterparties.length + ', rows_written=' + rows.length);

  return {
    ok: true,
    report_rows_total: reportRows.length,
    rows_written: rows.length
  };
}

function refreshClientBalancesPart(partIndex, totalParts) {
  ensureClientBalancesSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_CLIENT_BALANCES);
  ensureExactHeaders(sheet, CLIENT_BALANCES_HEADERS);

  const counterparties = fetchAllCounterparties();
  const deferredLookup = buildCounterpartyDeferredDaysLookup(counterparties);
  const tagMetaLookup = buildClientTagMetaLookup();
  const reportRows = getClientBalancesReportRowsPart(partIndex, totalParts);
  const rows = buildClientBalanceRows(reportRows, deferredLookup, tagMetaLookup);
  const numericPart = Math.max(1, Number(partIndex || 1));

  if (numericPart === 1) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, CLIENT_BALANCES_HEADERS.length).setValues([CLIENT_BALANCES_HEADERS]);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CLIENT_BALANCES_HEADERS.length).setValues([CLIENT_BALANCES_HEADERS]);
  }

  if (rows.length) {
    const startRow = Math.max(2, sheet.getLastRow() + 1);
    sheet.getRange(startRow, 1, rows.length, CLIENT_BALANCES_HEADERS.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, CLIENT_BALANCES_HEADERS.length);
  setSystemMetaValue('client_balances_last_refresh', nowText());
  markDashboardServerSnapshotStale_('client_balances_refreshed_part');
  Logger.log('refreshClientBalancesPart -> part=' + numericPart + '/' + totalParts + ', report_rows=' + reportRows.length + ', counterparties=' + counterparties.length + ', rows_written=' + rows.length);

  return {
    ok: true,
    part: numericPart,
    total_parts: totalParts,
    report_rows_total: reportRows.length,
    rows_written: rows.length
  };
}

function debugClientBalancesSample() {
  ensureClientBalancesDebugSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_CLIENT_BALANCES_DEBUG);
  ensureExactHeaders(sheet, CLIENT_BALANCES_DEBUG_HEADERS);

  const reportRows = fetchAllCounterpartyBalancesReportRows().slice(0, 25);
  const rows = reportRows.map(function(reportRow) {
    var counterparty = safeGet(reportRow, ['counterparty'], {}) || {};
    return [
      extractCounterpartyIdFromReportRow(reportRow),
      normalizeCell(counterparty && counterparty.name),
      JSON.stringify(safeGet(reportRow, ['accountsReceivable'], '')),
      JSON.stringify(safeGet(reportRow, ['accountsPayable'], '')),
      JSON.stringify(safeGet(reportRow, ['balance'], '')),
      JSON.stringify(safeGet(reportRow, ['debt'], '')),
      JSON.stringify(safeGet(reportRow, ['state', 'balance'], '')),
      JSON.stringify(safeGet(reportRow, ['agent', 'balance'], '')),
      JSON.stringify(safeGet(reportRow, ['accounts'], '')),
      JSON.stringify(safeGet(reportRow, ['attributes'], '')),
      nowText()
    ];
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, CLIENT_BALANCES_DEBUG_HEADERS.length).setValues([CLIENT_BALANCES_DEBUG_HEADERS]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, CLIENT_BALANCES_DEBUG_HEADERS.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, CLIENT_BALANCES_DEBUG_HEADERS.length);

  return {
    ok: true,
    sampled: rows.length
  };
}

function debugAccountRefsSample() {
  ensureClientBalancesAccountsDebugSheet();
  const sheet = getSpreadsheet().getSheetByName(SHEET_CLIENT_BALANCES_ACCOUNTS_DEBUG);
  ensureExactHeaders(sheet, CLIENT_BALANCES_ACCOUNTS_DEBUG_HEADERS);

  const counterparties = fetchAllCounterparties().slice(0, 25);
  const rows = [];

  counterparties.forEach(function(counterparty) {
    const detail = fetchCounterpartyDetailById(counterparty && counterparty.id) || counterparty || {};
    const accounts = safeGet(detail, ['accounts'], []);

    if (!Array.isArray(accounts) || !accounts.length) {
      rows.push([
        normalizeCell(counterparty && counterparty.id),
        normalizeCell(counterparty && counterparty.name),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        nowText()
      ]);
      return;
    }

    accounts.forEach(function(accountMeta, index) {
      const accountDetail = fetchAccountDetailByMeta(accountMeta) || {};
      rows.push([
        normalizeCell(counterparty && counterparty.id),
        normalizeCell(counterparty && counterparty.name),
        index + 1,
        normalizeCell(safeGet(accountMeta, ['meta', 'href'], safeGet(accountMeta, ['href'], ''))),
        normalizeCell(accountDetail.id),
        normalizeCell(accountDetail.name),
        JSON.stringify(safeGet(accountDetail, ['balance'], '')),
        JSON.stringify(safeGet(accountDetail, ['sum'], '')),
        JSON.stringify(safeGet(accountDetail, ['accountsReceivable'], '')),
        JSON.stringify(safeGet(accountDetail, ['accountsPayable'], '')),
        JSON.stringify(safeGet(accountDetail, ['available'], '')),
        JSON.stringify(safeGet(accountDetail, ['credit'], '')),
        JSON.stringify(safeGet(accountDetail, ['debit'], '')),
        JSON.stringify(accountDetail),
        nowText()
      ]);
    });
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, CLIENT_BALANCES_ACCOUNTS_DEBUG_HEADERS.length).setValues([CLIENT_BALANCES_ACCOUNTS_DEBUG_HEADERS]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, CLIENT_BALANCES_ACCOUNTS_DEBUG_HEADERS.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, CLIENT_BALANCES_ACCOUNTS_DEBUG_HEADERS.length);

  return {
    ok: true,
    sampled_counterparties: counterparties.length,
    rows_written: rows.length
  };
}

function getClientTagMap() {
  const rows = getSheetObjects(SHEET_CLIENT_TAG_MAP);
  const map = {};

  rows.forEach(function(row) {
    const client = normalizeCell(row.client);
    if (!client) return;

    map[client] = {
      counterparty_id: normalizeCell(row.counterparty_id),
      client: client,
      manager_tag: normalizeTagName(row.manager_tag),
      exclude_tags: normalizeCell(row.exclude_tags),
      all_tags: normalizeCell(row.all_tags)
    };
  });

  return map;
}

function enrichRowsWithManagerTag(rows) {
  if (!Array.isArray(rows)) return [];

  const clientTagMap = getClientTagMap();

  return rows.map(function(row) {
    const client = normalizeCell(row.client);
    const originalManager = normalizeCell(row.manager || '');
    const binding = clientTagMap[client] || null;

    const enriched = {};
    Object.keys(row).forEach(function(key) {
      enriched[key] = row[key];
    });

    enriched.original_manager = originalManager;
    enriched.manager_tag = binding ? normalizeTagName(binding.manager_tag) : '';
    enriched.client_exclude_tags = binding ? binding.exclude_tags : '';
    enriched.client_all_tags = binding ? binding.all_tags : '';
    enriched.counterparty_id = binding ? binding.counterparty_id : '';

    return enriched;
  });
}

function getClientTagMapRowsForAdmin(sessionToken) {
  requireAdminBySession(sessionToken);
  return getClientTagMapRowsForAdmin_();
}

// --------------------------------------------------
// CLIENT -> MANAGER MAP
// --------------------------------------------------

function getClientManagerMap() {
  const rows = getSheetObjects(SHEET_CLIENT_MANAGER_MAP);
  const map = {};

  rows.forEach(function(row) {
    const client = normalizeCell(row.client);
    const effectiveManager = normalizeCell(row.effective_manager);
    const active = isTruthyCell(row.active);

    if (!client || !effectiveManager || !active) return;
    map[client] = effectiveManager;
  });

  return map;
}

function getClientAliasMap() {
  const rows = getSheetObjects(SHEET_CLIENT_ALIAS_MAP);
  const map = {};

  rows.forEach(function(row) {
    const sourceClient = normalizeCell(row.source_client);
    const targetClient = normalizeCell(row.target_client);
    const active = isTruthyCell(row.active);

    if (!sourceClient || !targetClient || !active) return;
    map[sourceClient] = targetClient;
  });

  return map;
}

function resolveClientAlias(client, aliasMap) {
  let current = normalizeCell(client);
  if (!current) return '';

  const visited = {};
  for (var i = 0; i < 10; i++) {
    if (!aliasMap[current] || visited[current]) break;
    visited[current] = true;
    current = normalizeCell(aliasMap[current]);
  }

  return current;
}

function applyClientAliasMap(rows) {
  if (!Array.isArray(rows)) return [];

  const aliasMap = getClientAliasMap();

  return rows.map(function(row) {
    const enriched = {};
    Object.keys(row).forEach(function(key) {
      enriched[key] = row[key];
    });

    const aliasedClient = resolveClientAlias(row.client, aliasMap);
    if (aliasedClient) {
      enriched.original_client = normalizeCell(row.client);
      enriched.client = aliasedClient;
    }

    return enriched;
  });
}

function resolveEffectiveManager(client, originalManager, clientManagerMap) {
  const cleanClient = normalizeCell(client);
  if (cleanClient && clientManagerMap[cleanClient]) {
    return clientManagerMap[cleanClient];
  }
  return normalizeCell(originalManager);
}

function enrichRowsWithEffectiveManager(rows) {
  if (!Array.isArray(rows)) return rows;

  const clientManagerMap = getClientManagerMap();

  return rows.map(function(row) {
    const client = normalizeCell(row.client);
    const originalManager = normalizeCell(row.manager || '');
    const effectiveManager = resolveEffectiveManager(client, originalManager, clientManagerMap);

    const enriched = {};
    Object.keys(row).forEach(function(key) {
      enriched[key] = row[key];
    });

    enriched.original_manager = originalManager;
    enriched.effective_manager = effectiveManager;

    return enriched;
  });
}

function filterRowsForUser(rows, user) {
  if (!Array.isArray(rows)) return [];
  if (user.is_admin) return rows;

  const managerTag = normalizeTagName(user.manager_tag);
  const fallbackName = normalizeTagName(user.display_name);
  const accessKey = managerTag || fallbackName;
  if (!accessKey) return [];

  return rows.filter(function(row) {
    const tag = normalizeTagName(row.manager_tag);
    const fallback = normalizeTagName(row.effective_manager || row.manager || '');
    return (tag && tag === accessKey) || (!tag && fallback === accessKey);
  });
}

function getClientManagerMapRowsForAdmin(sessionToken) {
  requireAdminBySession(sessionToken);
  return getClientManagerMapRowsForAdmin_();
}

// --------------------------------------------------
// SALES SYNC
// --------------------------------------------------

function extractManager(agent, demand) {
  return (
    safeGet(agent, ['group', 'name'], '') ||
    safeGet(agent, ['owner', 'name'], '') ||
    safeGet(agent, ['responsible', 'name'], '') ||
    safeGet(demand, ['owner', 'name'], '') ||
    ''
  );
}

function extractSku(assortment) {
  return padSku(
    safeGet(assortment, ['code'], '') ||
    safeGet(assortment, ['article'], '') ||
    ''
  );
}

function extractBrandFromAttributes_(entity) {
  var attrs = entity && entity.attributes;
  if (!Array.isArray(attrs)) return '';

  for (var i = 0; i < attrs.length; i++) {
    var attr = attrs[i] || {};
    var name = normalizeCell(attr.name || attr.title || '').toLowerCase();
    if (name !== 'бренд') continue;

    var value = attr.value;
    if (value === null || value === undefined || value === '') return '';

    if (typeof value === 'object') {
      return normalizeCell(value.name || value.value || value.description || '');
    }
    return normalizeCell(value);
  }

  return '';
}

var BRAND_ATTR_CACHE_ = {};

function fetchEntityWithAttributes_(metaHref) {
  if (!metaHref) return null;

  var url = String(metaHref);
  var expand = 'attributes,product,productFolder,brand,manufacturer';
  url += (url.indexOf('?') === -1 ? '?' : '&') + 'expand=' + encodeURIComponent(expand);

  return fetchJsonUrl(url, {
    Authorization: 'Bearer ' + getMoySkladToken(),
    Accept: 'application/json;charset=utf-8',
    'Content-Type': 'application/json;charset=utf-8'
  });
}

function extractBrand(assortment) {
  var cacheKey =
    normalizeCell(safeGet(assortment, ['id'], '')) ||
    normalizeCell(safeGet(assortment, ['meta', 'href'], ''));

  if (cacheKey && Object.prototype.hasOwnProperty.call(BRAND_ATTR_CACHE_, cacheKey)) {
    return BRAND_ATTR_CACHE_[cacheKey];
  }

  var brand =
    normalizeCell(safeGet(assortment, ['brand', 'name'], '')) ||
    normalizeCell(safeGet(assortment, ['manufacturer', 'name'], '')) ||
    extractBrandFromAttributes_(assortment);

  var full = null;

  if (!brand) {
    var href = safeGet(assortment, ['meta', 'href'], '');
    if (href) {
      try {
        full = fetchEntityWithAttributes_(href);
        brand =
          normalizeCell(safeGet(full, ['brand', 'name'], '')) ||
          normalizeCell(safeGet(full, ['manufacturer', 'name'], '')) ||
          extractBrandFromAttributes_(full);
      } catch (e) {
        Logger.log('extractBrand full entity error: ' + e);
      }
    }
  }

  if (!brand && full) {
    var productHref =
      safeGet(full, ['product', 'meta', 'href'], '') ||
      safeGet(full, ['meta', 'productHref'], '');
    if (productHref) {
      try {
        var productEntity = fetchEntityWithAttributes_(productHref);
        brand =
          normalizeCell(safeGet(productEntity, ['brand', 'name'], '')) ||
          normalizeCell(safeGet(productEntity, ['manufacturer', 'name'], '')) ||
          extractBrandFromAttributes_(productEntity);
      } catch (e2) {
        Logger.log('extractBrand parent product error: ' + e2);
      }
    }
  }

  brand = normalizeCell(brand) || normalizeCell(safeGet(assortment, ['productFolder', 'name'], ''));

  if (cacheKey) BRAND_ATTR_CACHE_[cacheKey] = brand;
  return brand;
}

function extractProductGroup(assortment) {
  return (
    safeGet(assortment, ['pathName'], '') ||
    safeGet(assortment, ['productFolder', 'name'], '') ||
    safeGet(assortment, ['group', 'name'], '') ||
    ''
  );
}

function resolveSalesProductGroupFromAssortment_(assortment) {
  const productName = safeGet(assortment, ['name'], 'Без назви');
  const rawGroup = extractProductGroup(assortment);
  return normalizeProductGroupFromMoySklad_(rawGroup, productName);
}

function normalizeProductGroupFromMoySklad_(groupRaw, productName) {
  const group = normalizeCell(groupRaw);
  const product = normalizeCell(productName);
  const lowerGroup = group.toLowerCase();

  if (group) {
    if (
      lowerGroup.indexOf('перехідник') >= 0 ||
      lowerGroup.indexOf('переходник') >= 0 ||
      lowerGroup.indexOf('usb-c') >= 0 ||
      lowerGroup.indexOf('usb c') >= 0 ||
      lowerGroup.indexOf('type-c') >= 0 ||
      lowerGroup.indexOf('type c') >= 0
    ) {
      return 'Перехідники/USB-C аксесуари';
    }

    const normalizedFromGroup = toTitleCaseUkrGroup(normalizeProductGroupBusiness(group, ''));
    return normalizedFromGroup || group;
  }

  return toTitleCaseUkrGroup(normalizeProductGroupBusiness('', product)) || '';
}

function extractCategory(assortment) {
  return (
    safeGet(assortment, ['uom', 'name'], '') ||
    safeGet(assortment, ['salePrices', 0, 'priceType', 'name'], '') ||
    ''
  );
}

function extractPositionId(pos) {
  return safeGet(pos, ['id'], '') || safeGet(pos, ['meta', 'href'], '') || '';
}

function extractDiscountPct(pos) {
  var raw =
    safeGet(pos, ['discount'], '') ||
    safeGet(pos, ['discountPercent'], '') ||
    safeGet(pos, ['discountpercent'], '') ||
    safeGet(pos, ['discountPct'], '') ||
    safeGet(pos, ['discountpct'], '') ||
    safeGet(pos, ['discountProportion'], '') ||
    safeGet(pos, ['discountproportion'], '');

  var value = Number(raw || 0);

  // Some APIs can return discount as a fraction (0.125) instead of percent (12.5)
  if (value > 0 && value <= 1) {
    value = value * 100;
  }

  return round2(value);
}

function extractRevenue(pos, quantity, unitPrice, discountPct) {
  var sumValue = safeGet(pos, ['sum'], null);

  if (sumValue !== null && sumValue !== '' && sumValue !== undefined) {
    return round2(money(sumValue));
  }

  var gross = Number(quantity || 0) * Number(unitPrice || 0);
  var net = gross * (1 - Number(discountPct || 0) / 100);
  return round2(net);
}

function ensureMainSheet() {
  const sheet = getOrCreateSheet(SHEET_MAIN);
  ensureExactHeaders(sheet, HEADERS);
  applySpecialSheetFormats(sheet);
  return sheet;
}

function fetchSalesChunk(filter, offset) {
  const conductedFilter = filter
    ? filter + ';applicable=true'
    : 'applicable=true';
  const query = buildQuery({
    limit: DEMAND_LIMIT,
    offset: offset,
    expand: 'agent,positions.assortment,owner,state',
    filter: conductedFilter
  });

  const url = getApiBase() + '/entity/demand?' + query;
  const data = apiGet(url);
  return data.rows || [];
}

function buildSalesRows(rows) {
  const out = [];

  rows.forEach(function(demand) {
    const agent = demand.agent || {};
    const client = safeGet(agent, ['name'], 'Без клієнта');
    const positions = safeGet(demand, ['positions', 'rows'], []);

    positions.forEach(function(pos) {
      const assortment = pos.assortment || {};
      const quantity = Number(pos.quantity || 0);
      const unitPrice = round2(money(pos.price));
      const discountPct = extractDiscountPct(pos);
      const revenue = extractRevenue(pos, quantity, unitPrice, discountPct);
      const normalizedGroup = resolveSalesProductGroupFromAssortment_(assortment);

      out.push([
        momentToMonth(demand.moment || ''),
        demand.moment || '',
        demand.id || '',
        demand.name || '',
        client,
        extractPositionId(pos),
        extractSku(assortment),
        safeGet(assortment, ['name'], 'Без назви'),
        normalizedGroup,
        extractBrand(assortment),
        quantity,
        unitPrice,
        discountPct,
        revenue,
        extractDemandStatus(demand)
      ]);
    });
  });

  return out;
}

function isExcludedSalesStatusText_(statusValue) {
  const status = normalizeCell(statusValue).toLowerCase();
  if (!status) return false;

  return (
    status === 'чернетка' ||
    status.indexOf('чернет') >= 0 ||
    status === 'draft' ||
    status.indexOf('не провед') >= 0 ||
    status.indexOf('непровед') >= 0
  );
}

function isDemandEligibleForSales(demand) {
  if (!demand) return false;

  // Ignore non-conducted shipments even if their state name is "В роботі".
  if (typeof demand.applicable === 'boolean' && !demand.applicable) {
    return false;
  }

  const status = extractDemandStatus(demand).toLowerCase();
  if (!status) return true;

  return !isExcludedSalesStatusText_(status);
}

function extractDemandStatus(demand) {
  return normalizeCell(safeGet(demand, ['state', 'name'], ''));
}

// СТАБІЛЬНИЙ КЛЮЧ ПРОДАЖІВ
function buildSalesRowKey(row) {
  const orderId = normalizeCell(row[2] || '');
  const positionId = normalizeCell(row[5] || '');
  const sku = normalizeCell(row[6] || '');
  const product = normalizeCell(row[7] || '');

  return [orderId, positionId || sku || product].join('||');
}

function getUniqueSalesRows(rows) {
  const seen = new Set();
  const out = [];
  let duplicateCount = 0;

  rows.forEach(function(row) {
    const key = buildSalesRowKey(row);
    if (!key || key === '||') return;

    if (!seen.has(key)) {
      seen.add(key);
      out.push(row);
    } else {
      duplicateCount++;
    }
  });

  Logger.log(
    'getUniqueSalesRows -> input=' + rows.length +
    ', output=' + out.length +
    ', duplicates_removed=' + duplicateCount
  );

  return out;
}

function fetchSalesPeriodRows(startText, endTextExclusive) {
  const safeStart = clampStartDate(startText);
  const filter = 'moment>=' + safeStart + ';moment<' + endTextExclusive;

  let offset = 0;
  let allRows = [];

  while (true) {
    const rows = fetchSalesChunk(filter, offset);
    if (!rows.length) break;

    allRows = allRows.concat(buildSalesRows(rows));

    if (rows.length < DEMAND_LIMIT) break;
    offset += DEMAND_LIMIT;
    Utilities.sleep(300);
  }

  return allRows;
}

function rebuildMonthByYearMonth(year, month) {
  const sheet = ensureMainSheet();
  const range = getMonthRangeByYearMonth(year, month);

  const freshRows = fetchSalesPeriodRows(range.start, range.endExclusive);
  const uniqueFreshRows = getUniqueSalesRows(freshRows);

  const monthRowNumbers = getMonthRowNumbersByDateColumn(sheet, range.monthPrefix, 2);
  deleteRowsInBlocks(sheet, monthRowNumbers);

  if (uniqueFreshRows.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, uniqueFreshRows.length, HEADERS.length).setValues(uniqueFreshRows);
  }

  Logger.log(
    'rebuildMonthByYearMonth -> ' + range.monthLabel +
    ', deleted old rows: ' + monthRowNumbers.length +
    ', inserted unique rows: ' + uniqueFreshRows.length
  );

  return {
    month: range.monthLabel,
    deleted_rows: monthRowNumbers.length,
    inserted_rows: uniqueFreshRows.length
  };
}

function prepareSalesSheetForFullReload() {
  const sheet = getOrCreateSheet(SHEET_MAIN);
  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  applySpecialSheetFormats(sheet);
  return sheet;
}

function rebuildCurrentMonthDedup() {
  const sheet = ensureMainSheet();
  const range = getCurrentMonthRange();

  const freshRows = fetchSalesPeriodRows(range.start, range.endExclusive);
  const uniqueFreshRows = getUniqueSalesRows(freshRows);

  const monthRowNumbers = getMonthRowNumbersByDateColumn(sheet, range.monthPrefix, 2);
  deleteRowsInBlocks(sheet, monthRowNumbers);

  if (uniqueFreshRows.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, uniqueFreshRows.length, HEADERS.length).setValues(uniqueFreshRows);
  }

  Logger.log(
    'rebuildCurrentMonthDedup -> deleted old month rows: ' +
    monthRowNumbers.length +
    ', inserted unique rows: ' +
    uniqueFreshRows.length
  );
}

function DailyRefreshNow() {
  const sheet = ensureMainSheet();
  const bounds = getTodayBounds();

  const freshRows = fetchSalesPeriodRows(bounds.start, bounds.endExclusive);
  const uniqueFreshRows = getUniqueSalesRows(freshRows);

  const dayRowNumbers = getDayRowNumbersByDateColumn(sheet, bounds.dayPrefix, 2);
  deleteRowsInBlocks(sheet, dayRowNumbers);

  if (uniqueFreshRows.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, uniqueFreshRows.length, HEADERS.length).setValues(uniqueFreshRows);
  }

  rebuildServerCache();

  Logger.log(
    'DailyRefreshNow -> deleted old day rows: ' +
    dayRowNumbers.length +
    ', inserted unique rows: ' +
    uniqueFreshRows.length
  );
}

function rebuildServerCache() {
  const main = ensureMainSheet();
  const archive = getOrCreateSheet(SHEET_ARCHIVE);
  const current = getOrCreateSheet(SHEET_CURRENT);

  const data = main.getDataRange().getValues();

  archive.clearContents();
  current.clearContents();

  ensureExactHeaders(archive, HEADERS);
  ensureExactHeaders(current, HEADERS);
  archive.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  current.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  applySpecialSheetFormats(archive);
  applySpecialSheetFormats(current);

  if (!data || data.length < 2) {
    setSalesLastRefreshNow();
    return;
  }

  const monthPrefix = getCurrentMonthRange().monthPrefix;
  const archiveRows = [];
  const currentRows = [];

  data.slice(1).forEach(function(row) {
    const date = String(row[1] || '');
    if (date.indexOf(monthPrefix) === 0) currentRows.push(row);
    else archiveRows.push(row);
  });

  if (archiveRows.length) {
    archive.getRange(2, 1, archiveRows.length, HEADERS.length).setValues(archiveRows);
  }

  if (currentRows.length) {
    current.getRange(2, 1, currentRows.length, HEADERS.length).setValues(currentRows);
  }

  archive.setFrozenRows(1);
  current.setFrozenRows(1);
  setSalesLastRefreshNow();
  markDashboardServerSnapshotStale_('sales_cache_rebuilt');

  Logger.log('rebuildServerCache -> archive=' + archiveRows.length + ', current=' + currentRows.length);
}

function monthlyRepairNow() {
  rebuildCurrentMonthDedup();
  rebuildServerCache();
}

function getManualSalesRebuildTarget_() {
  const year = Number(MANUAL_SALES_REBUILD_YEAR);
  const month = Number(MANUAL_SALES_REBUILD_MONTH);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('MANUAL_SALES_REBUILD_YEAR має бути цілим роком, наприклад 2026');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('MANUAL_SALES_REBUILD_MONTH має бути від 1 до 12');
  }
  return { year: year, month: month };
}

function fillSalesSelectedMonthNow() {
  const target = getManualSalesRebuildTarget_();
  const result = rebuildMonthByYearMonth(target.year, target.month);
  return {
    ok: true,
    month_key: String(target.year) + '-' + String(target.month).padStart(2, '0'),
    month: result.month,
    deleted_rows: result.deleted_rows,
    inserted_rows: result.inserted_rows
  };
}

function fillSalesSelectedMonthAndRebuildCache() {
  const result = fillSalesSelectedMonthNow();
  rebuildServerCache();
  result.cache_rebuilt = true;
  return result;
}

function getPreviousMonthYearMonth_() {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    year: previous.getFullYear(),
    month: previous.getMonth() + 1
  };
}

function refreshPreviousMonthNow() {
  const target = getPreviousMonthYearMonth_();
  const result = rebuildMonthByYearMonth(target.year, target.month);
  rebuildServerCache();
  return {
    ok: true,
    month_key: String(target.year) + '-' + String(target.month).padStart(2, '0'),
    month: result.month,
    deleted_rows: result.deleted_rows,
    inserted_rows: result.inserted_rows,
    cache_rebuilt: true
  };
}

// --------------------------------------------------
// PAYMENTS SYNC
// --------------------------------------------------

function ensurePaymentsMainSheet() {
  const sheet = getOrCreateSheet(SHEET_PAYMENTS_MAIN);
  ensureHeadersForSheet(sheet, PAYMENT_HEADERS);
  return sheet;
}

function extractPaymentManager(agent, paymentDoc) {
  return (
    safeGet(agent, ['group', 'name'], '') ||
    safeGet(agent, ['owner', 'name'], '') ||
    safeGet(agent, ['responsible', 'name'], '') ||
    safeGet(paymentDoc, ['owner', 'name'], '') ||
    ''
  );
}

function fetchPaymentsChunk(filter, offset) {
  const query = buildQuery({
    limit: PAYMENT_LIMIT,
    offset: offset,
    expand: 'agent,organization,owner',
    filter: filter
  });

  const url = getApiBase() + '/entity/cashin?' + query;
  const data = apiGet(url);
  return data.rows || [];
}

function buildPaymentRows(rows) {
  const out = [];

  rows.forEach(function(paymentDoc) {
    const agent = paymentDoc.agent || {};
    const client = safeGet(agent, ['name'], 'Без клієнта');
    const manager = extractPaymentManager(agent, paymentDoc);
    const organization = safeGet(paymentDoc, ['organization', 'name'], '');
    const amount = money(paymentDoc.sum);
    const description = paymentDoc.description || '';
    const agentSyncId = safeGet(agent, ['id'], '');

    out.push([
      momentToMonth(paymentDoc.moment || ''),
      paymentDoc.moment || '',
      paymentDoc.id || '',
      paymentDoc.name || '',
      client,
      manager,
      amount,
      description,
      organization,
      agentSyncId
    ]);
  });

  return out;
}

function buildPaymentRowKey(row) {
  const paymentId = normalizeCell(row[2] || '');
  const client = normalizeCell(row[4] || '');
  const amount = normalizeCell(row[6] || '');

  return [paymentId, client, amount].join('||');
}

function getUniquePaymentRows(rows) {
  const seen = new Set();
  const out = [];
  let duplicateCount = 0;

  rows.forEach(function(row) {
    const key = buildPaymentRowKey(row);
    if (!key || key === '||') return;

    if (!seen.has(key)) {
      seen.add(key);
      out.push(row);
    } else {
      duplicateCount++;
    }
  });

  Logger.log(
    'getUniquePaymentRows -> input=' + rows.length +
    ', output=' + out.length +
    ', duplicates_removed=' + duplicateCount
  );

  return out;
}

function fetchPaymentsPeriodRows(startText, endTextExclusive) {
  const safeStart = clampStartDate(startText);
  const filter = 'moment>=' + safeStart + ';moment<' + endTextExclusive;

  let offset = 0;
  let allRows = [];

  while (true) {
    const rows = fetchPaymentsChunk(filter, offset);
    if (!rows.length) break;

    allRows = allRows.concat(buildPaymentRows(rows));

    if (rows.length < PAYMENT_LIMIT) break;
    offset += PAYMENT_LIMIT;
    Utilities.sleep(300);
  }

  return allRows;
}

function getPaymentsLast3MonthsRange() {
  const now = new Date();

  const rawStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0);
  const endExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);

  const minDateObj = new Date(2024, 0, 1, 0, 0, 0);
  const start = rawStart < minDateObj ? minDateObj : rawStart;

  return {
    start: Utilities.formatDate(start, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    endExclusive: Utilities.formatDate(endExclusive, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  };
}

function rebuildPaymentsLast3MonthsDedup() {
  const sheet = ensurePaymentsMainSheet();
  const range = getPaymentsLast3MonthsRange();

  const freshRows = fetchPaymentsPeriodRows(range.start, range.endExclusive);
  const uniqueFreshRows = getUniquePaymentRows(freshRows);

  sheet.clearContents();
  sheet.getRange(1, 1, 1, PAYMENT_HEADERS.length).setValues([PAYMENT_HEADERS]);

  if (uniqueFreshRows.length) {
    sheet.getRange(2, 1, uniqueFreshRows.length, PAYMENT_HEADERS.length).setValues(uniqueFreshRows);
  }

  sheet.setFrozenRows(1);

  Logger.log(
    'rebuildPaymentsLast3MonthsDedup -> inserted unique rows: ' +
    uniqueFreshRows.length +
    ', range: ' + range.start + ' -> ' + range.endExclusive
  );
}

function PaymentsDailyRefreshNow() {
  rebuildPaymentsLast3MonthsDedup();
  rebuildPaymentsServerCache();

  Logger.log('PaymentsDailyRefreshNow -> rebuilt rolling last 3 months');
}

function rebuildPaymentsServerCache() {
  const main = ensurePaymentsMainSheet();
  const archive = getOrCreateSheet(SHEET_PAYMENTS_ARCHIVE);
  const current = getOrCreateSheet(SHEET_PAYMENTS_CURRENT);

  const data = main.getDataRange().getValues();

  archive.clearContents();
  current.clearContents();

  archive.getRange(1, 1, 1, PAYMENT_HEADERS.length).setValues([PAYMENT_HEADERS]);
  current.getRange(1, 1, 1, PAYMENT_HEADERS.length).setValues([PAYMENT_HEADERS]);

  if (!data || data.length < 2) return;

  const monthPrefix = getCurrentMonthRange().monthPrefix;
  const archiveRows = [];
  const currentRows = [];

  data.slice(1).forEach(function(row) {
    const date = String(row[1] || '');

    if (date.indexOf(monthPrefix) === 0) currentRows.push(row);
    else archiveRows.push(row);
  });

  if (archiveRows.length) {
    archive.getRange(2, 1, archiveRows.length, PAYMENT_HEADERS.length).setValues(archiveRows);
  }

  if (currentRows.length) {
    current.getRange(2, 1, currentRows.length, PAYMENT_HEADERS.length).setValues(currentRows);
  }

  archive.setFrozenRows(1);
  current.setFrozenRows(1);

  Logger.log('rebuildPaymentsServerCache -> archive=' + archiveRows.length + ', current=' + currentRows.length);
}

function paymentsMonthlyRepairNow() {
  rebuildPaymentsLast3MonthsDedup();
  rebuildPaymentsServerCache();

  Logger.log('paymentsMonthlyRepairNow -> rebuilt rolling last 3 months');
}

// --------------------------------------------------
// DEBUG / SUGGESTIONS
// --------------------------------------------------

function debugSalesDuplicatesCurrentMonth() {
  const range = getCurrentMonthRange();
  const rows = fetchSalesPeriodRows(range.start, range.endExclusive);

  const counter = {};
  rows.forEach(function(row) {
    const key = buildSalesRowKey(row);
    if (!key || key === '||') return;
    counter[key] = (counter[key] || 0) + 1;
  });

  const duplicates = Object.keys(counter)
    .filter(function(key) { return counter[key] > 1; })
    .map(function(key) {
      return { key: key, count: counter[key] };
    })
    .sort(function(a, b) { return b.count - a.count; });

  Logger.log('debugSalesDuplicatesCurrentMonth -> duplicates=' + duplicates.length);
  Logger.log(JSON.stringify(duplicates.slice(0, 100), null, 2));
}

function detectManagerChangesCandidates() {
  const rows = sheetToObjects(SHEET_MAIN);
  if (!Array.isArray(rows) || !rows.length) return [];

  const byClient = {};

  rows.forEach(function(row) {
    const client = normalizeCell(row.client);
    const manager = normalizeCell(row.manager);
    const date = normalizeCell(row.date);

    if (!client || !manager || !date) return;
    if (!byClient[client]) byClient[client] = [];
    byClient[client].push({ client: client, manager: manager, date: date });
  });

  const out = [];

  Object.keys(byClient).forEach(function(client) {
    const items = byClient[client].sort(function(a, b) {
      return String(a.date).localeCompare(String(b.date));
    });

    const uniqueManagers = [];
    items.forEach(function(item) {
      if (!uniqueManagers.includes(item.manager)) uniqueManagers.push(item.manager);
    });

    if (uniqueManagers.length >= 2) {
      const oldManager = uniqueManagers[0];
      const newManager = uniqueManagers[uniqueManagers.length - 1];

      if (oldManager !== newManager) {
        out.push({
          client: client,
          old_manager: oldManager,
          new_manager: newManager,
          detected_at: nowText(),
          status: 'new',
          comment: 'Автоматично знайдено'
        });
      }
    }
  });

  return out;
}

function saveManagerChangeSuggestions() {
  const sheet = getOrCreateSheet(SHEET_MANAGER_CHANGE_SUGGESTIONS);
  ensureHeadersForSheet(sheet, MANAGER_CHANGE_SUGGESTIONS_HEADERS);

  const found = detectManagerChangesCandidates();
  if (!found.length) return;

  const existing = getSheetObjects(SHEET_MANAGER_CHANGE_SUGGESTIONS);
  const existingKeys = new Set(existing.map(function(r) {
    return [normalizeCell(r.client), normalizeCell(r.old_manager), normalizeCell(r.new_manager)].join('||');
  }));

  const toInsert = found.filter(function(r) {
    const key = [r.client, r.old_manager, r.new_manager].join('||');
    return !existingKeys.has(key);
  }).map(function(r) {
    return [r.client, r.old_manager, r.new_manager, r.detected_at, r.status, r.comment];
  });

  if (!toInsert.length) return;

  sheet.getRange(sheet.getLastRow() + 1, 1, toInsert.length, MANAGER_CHANGE_SUGGESTIONS_HEADERS.length).setValues(toInsert);
}

function testCounterpartyBalanceAccess() {
  const base = getApiBase();
  const token = getMoySkladToken();
  const maskedToken =
    token && token.length > 10
      ? token.slice(0, 4) + '...' + token.slice(-4)
      : '(short)';

  const reportUrl = base + '/report/counterparty?' + buildQuery({ limit: 1, offset: 0 });

  try {
    const data = apiGet(reportUrl);
    const rows = Array.isArray(data && data.rows) ? data.rows : [];
    const first = rows[0] || {};

    return {
      ok: true,
      api_base: base,
      token_masked: maskedToken,
      report_url: reportUrl,
      rows_received: rows.length,
      first_counterparty: normalizeCell(safeGet(first, ['counterparty', 'name'], '')),
      first_balance_raw: safeGet(first, ['balance'], ''),
      first_balance_money: round2(money(safeGet(first, ['balance'], 0)))
    };
  } catch (e) {
    return {
      ok: false,
      api_base: base,
      token_masked: maskedToken,
      report_url: reportUrl,
      error_message: String(e && e.message ? e.message : e)
    };
  }
}

// --------------------------------------------------
// PRODUCT GROUP / BRAND ONLY REPAIR
// --------------------------------------------------
// Безпечний repair для історії продажів:
// - не чіпає продажі, дати, клієнтів, кількість, ціни, revenue, order_id;
// - оновлює тільки product_group та brand;
// - головний ключ: sku / code з аркуша sales;
// - джерело правди: актуальні товари з MoySklad API;
// - працює пакетно по унікальних SKU, щоб не переписувати місяці.

function RUN_25_repairSalesProductGroupAndBrandOnly() {
  const result = repairSalesProductGroupAndBrandOnly();
  Logger.log('RUN_25_repairSalesProductGroupAndBrandOnly -> %s', JSON.stringify(result));
  return result;
}

function repairSalesProductGroupAndBrandOnly() {
  const salesSheets = getSalesSheetsForProductFieldsRepair_();
  const usedSkuMap = collectSalesSkuMapForProductFieldsRepair_(salesSheets);
  const usedSkus = Object.keys(usedSkuMap);

  if (!usedSkus.length) {
    return {
      ok: true,
      message: 'Не знайдено SKU у sales-аркушах.',
      sheets_processed: salesSheets.length,
      unique_sku: 0,
      rows_scanned: 0,
      rows_updated: 0
    };
  }

  const productLookup = buildMoySkladProductLookupForSalesRepair_(usedSkus, usedSkuMap);
  const summary = {
    ok: true,
    source: 'MoySklad entity/product + current sales SKU',
    unique_sku_in_sales: usedSkus.length,
    products_loaded_from_api: productLookup.loaded,
    products_matched_by_sku: productLookup.matched_by_sku,
    products_matched_by_code: productLookup.matched_by_code,
    products_matched_by_article: productLookup.matched_by_article,
    products_matched_by_name: productLookup.matched_by_name,
    product_lookup_size: Object.keys(productLookup.bySku).length,
    sheets_processed: 0,
    rows_scanned: 0,
    rows_updated: 0,
    matched_by_sku: 0,
    matched_by_product_name: 0,
    not_found: 0,
    sheets: []
  };

  salesSheets.forEach(function(sheet) {
    const sheetResult = repairSalesProductFieldsInSheet_(sheet, productLookup);
    summary.sheets_processed += 1;
    summary.rows_scanned += sheetResult.rows_scanned;
    summary.rows_updated += sheetResult.rows_updated;
    summary.matched_by_sku += sheetResult.matched_by_sku;
    summary.matched_by_product_name += sheetResult.matched_by_product_name;
    summary.not_found += sheetResult.not_found;
    summary.sheets.push(sheetResult);
  });

  markDashboardServerSnapshotStale_('sales_product_group_brand_repaired_from_moysklad');
  return summary;
}

function getSalesSheetsForProductFieldsRepair_() {
  const ss = getSpreadsheet();
  const names = {};

  [SHEET_MAIN, SHEET_ARCHIVE, SHEET_CURRENT].forEach(function(name) {
    if (name) names[name] = true;
  });

  ss.getSheets().forEach(function(sheet) {
    const name = sheet.getName();
    if (/^sales_\d{4}$/.test(name)) {
      names[name] = true;
    }
  });

  return Object.keys(names)
    .map(function(name) { return ss.getSheetByName(name); })
    .filter(function(sheet) { return !!sheet; });
}

function collectSalesSkuMapForProductFieldsRepair_(salesSheets) {
  const skuMap = {};

  salesSheets.forEach(function(sheet) {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return normalizeCell(h);
    });

    const skuCol = headers.indexOf('sku') + 1;
    const productCol = headers.indexOf('product') + 1;
    if (!skuCol && !productCol) return;

    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    values.forEach(function(row) {
      const sku = skuCol ? normalizeCell(row[skuCol - 1]) : '';
      const product = productCol ? normalizeCell(row[productCol - 1]) : '';

      if (sku) {
        skuMap[normalizeRepairKey_(sku)] = {
          sku: sku,
          product: product
        };
      }
    });
  });

  return skuMap;
}

function buildMoySkladProductLookupForSalesRepair_(usedSkus, usedSkuMap) {
  const lookup = {
    bySku: {},
    byName: {},
    loaded: 0,
    matched_by_sku: 0,
    matched_by_code: 0,
    matched_by_article: 0,
    matched_by_name: 0
  };

  // 1) Fast broad load from product endpoint, paginated.
  // Беремо товарні картки, бо саме там є актуальна група/бренд.
  let offset = 0;
  const limit = 100;

  while (true) {
    const query = buildQuery({
      limit: limit,
      offset: offset,
      expand: 'productFolder,attributes'
    });

    const url = getApiBase() + '/entity/product?' + query;
    const data = apiGet(url);
    const rows = Array.isArray(data && data.rows) ? data.rows : [];
    if (!rows.length) break;

    rows.forEach(function(product) {
      const item = buildProductRepairItemFromMoySklad_(product);
      if (!item) return;

      lookup.loaded += 1;

      const keys = getProductRepairKeys_(item);
      keys.skuKeys.forEach(function(keyObj) {
        if (!keyObj.key) return;
        if (!lookup.bySku[keyObj.key]) {
          lookup.bySku[keyObj.key] = item;
          if (keyObj.type === 'sku') lookup.matched_by_sku += 1;
          if (keyObj.type === 'code') lookup.matched_by_code += 1;
          if (keyObj.type === 'article') lookup.matched_by_article += 1;
        }
      });

      if (item.product) {
        lookup.byName[normalizeRepairKey_(item.product)] = item;
      }
    });

    if (rows.length < limit) break;
    offset += limit;
    Utilities.sleep(150);
  }

  // 2) Name fallback only for sales rows whose SKU did not match, using product name from sales.
  // Це не основна логіка, а запасна, якщо в картці не збігається код.
  Object.keys(usedSkuMap).forEach(function(skuKey) {
    if (lookup.bySku[skuKey]) return;

    const productName = normalizeCell(usedSkuMap[skuKey] && usedSkuMap[skuKey].product);
    if (!productName) return;

    const byName = lookup.byName[normalizeRepairKey_(productName)];
    if (byName) {
      lookup.bySku[skuKey] = byName;
      lookup.matched_by_name += 1;
    }
  });

  return lookup;
}

function buildProductRepairItemFromMoySklad_(product) {
  if (!product) return null;

  const sku = normalizeCell(
    safeGet(product, ['article'], '') ||
    safeGet(product, ['code'], '') ||
    safeGet(product, ['externalCode'], '')
  );

  const code = normalizeCell(safeGet(product, ['code'], ''));
  const article = normalizeCell(safeGet(product, ['article'], ''));
  const externalCode = normalizeCell(safeGet(product, ['externalCode'], ''));
  const productName = normalizeCell(safeGet(product, ['name'], ''));

  const productGroupRaw =
    normalizeCell(safeGet(product, ['productFolder', 'name'], '')) ||
    normalizeCell(safeGet(product, ['folder', 'name'], ''));

  const productGroup = normalizeProductGroupFromMoySklad_(productGroupRaw, productName);

  const brand =
    extractBrand(product) ||
    extractBrandFromAttributesForRepair_(product) ||
    '';

  if (!sku && !code && !article && !externalCode && !productName) return null;

  return {
    sku: sku,
    code: code,
    article: article,
    externalCode: externalCode,
    product: productName,
    product_group: productGroup,
    brand: normalizeCell(brand)
  };
}

function getProductRepairKeys_(item) {
  const skuKeys = [];

  [
    { type: 'sku', value: item.sku },
    { type: 'code', value: item.code },
    { type: 'article', value: item.article },
    { type: 'externalCode', value: item.externalCode }
  ].forEach(function(entry) {
    const key = normalizeRepairKey_(entry.value);
    if (key) {
      skuKeys.push({
        type: entry.type,
        key: key
      });
    }
  });

  return {
    skuKeys: skuKeys
  };
}

function extractBrandFromAttributesForRepair_(product) {
  const attrs = safeGet(product, ['attributes'], []);
  if (!Array.isArray(attrs)) return '';

  for (var i = 0; i < attrs.length; i++) {
    const attrName = normalizeCell(safeGet(attrs[i], ['name'], '')).toLowerCase();
    if (attrName === 'бренд' || attrName === 'brand') {
      return normalizeCell(
        safeGet(attrs[i], ['value', 'name'], '') ||
        safeGet(attrs[i], ['value'], '')
      );
    }
  }

  return '';
}

function repairSalesProductFieldsInSheet_(sheet, productLookup) {
  const result = {
    sheet: sheet.getName(),
    rows_scanned: 0,
    rows_updated: 0,
    matched_by_sku: 0,
    matched_by_product_name: 0,
    not_found: 0
  };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return result;

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return normalizeCell(h);
  });

  const skuCol = headers.indexOf('sku') + 1;
  const productCol = headers.indexOf('product') + 1;
  const groupCol = headers.indexOf('product_group') + 1;
  const brandCol = headers.indexOf('brand') + 1;

  if (!skuCol || !productCol || !groupCol || !brandCol) {
    result.skipped = true;
    result.reason = 'Немає колонок sku/product/product_group/brand';
    return result;
  }

  const rowCount = lastRow - 1;
  const values = sheet.getRange(2, 1, rowCount, lastCol).getValues();
  const groupValues = [];
  const brandValues = [];
  let changed = false;

  values.forEach(function(row) {
    result.rows_scanned += 1;

    const sku = normalizeCell(row[skuCol - 1]);
    const product = normalizeCell(row[productCol - 1]);
    const oldGroup = normalizeCell(row[groupCol - 1]);
    const oldBrand = normalizeCell(row[brandCol - 1]);

    let match = null;
    let matchType = '';

    if (sku) {
      match = productLookup.bySku[normalizeRepairKey_(sku)] || null;
      if (match) matchType = 'sku';
    }

    if (!match && product) {
      match = productLookup.byName[normalizeRepairKey_(product)] || null;
      if (match) matchType = 'product_name';
    }

    if (!match) {
      result.not_found += 1;
      groupValues.push([oldGroup]);
      brandValues.push([oldBrand]);
      return;
    }

    if (matchType === 'sku') result.matched_by_sku += 1;
    if (matchType === 'product_name') result.matched_by_product_name += 1;

    const newGroup = normalizeCell(match.product_group) || oldGroup;
    const newBrand = normalizeCell(match.brand) || oldBrand;

    if (newGroup !== oldGroup || newBrand !== oldBrand) {
      result.rows_updated += 1;
      changed = true;
    }

    groupValues.push([newGroup]);
    brandValues.push([newBrand]);
  });

  if (changed) {
    sheet.getRange(2, groupCol, rowCount, 1).setValues(groupValues);
    sheet.getRange(2, brandCol, rowCount, 1).setValues(brandValues);
  }

  return result;
}

function normalizeRepairKey_(value) {
  return normalizeCell(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}


