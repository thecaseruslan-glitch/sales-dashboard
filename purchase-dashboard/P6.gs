// ==================================================
// ЗАКУПКИ DASHBOARD - BACKEND v9 / Закупка_4
// Звірка purchase_orders ↔ receipts + sales_history current month через логіку D9 RUN_06 + refresh loop без зміни бізнес-логіки
// ==================================================

const SHEET_STOCK_CURRENT = 'stock_current';
const SHEET_SALES_HISTORY = 'sales_history';
const SHEET_PURCHASE_ORDERS = 'purchase_orders';
const SHEET_RECEIPTS = 'receipts';
const SHEET_STOCK_SETTINGS = 'stock_settings';
const SHEET_CARRIER_RULES = 'carrier_rules';
const SHEET_SUPPLIER_CODE_RULES = 'supplier_code_rules';
const SHEET_PURCHASE_DELIVERY_SETTINGS = 'purchase_delivery_settings';
const SHEET_PURCHASE_ANALYSIS_SETTINGS = 'purchase_analysis_settings';
const SHEET_SYSTEM_META = 'system_meta';

const STOCK_CURRENT_HEADERS = [
  'product_id',
  'code',
  'product',
  'brand',
  'category',
  'group',
  'stock',
  'reserve',
  'available',
  'expected',
  'uom',
  'buy_price',
  'sale_price',
  'supplier',
  'updated_at',
  'status',
  'reorder_enabled'
];

const SALES_HISTORY_HEADERS = [
  'month',
  'date',
  'order_id',
  'order_name',
  'client',
  'position_id',
  'code',
  'product',
  'group',
  'brand',
  'quantity',
  'unit_price',
  'discount_pct',
  'revenue',
  'status',
  'product_id'
];

const PURCHASE_ORDERS_HEADERS = [
  'order_id',
  'order_name',
  'carrier_code',
  'carrier_name',
  'supplier_code',
  'supplier_name_from_code',
  'ship_date',
  'transit_days',
  'calculated_receipt_date',
  'order_date',
  'supplier',
  'status',
  'moysklad_planned_date',
  'product_id',
  'code',
  'product',
  'brand',
  'category',
  'group',
  'quantity_ordered',
  'quantity_received',
  'quantity_remaining',
  'receiving_status',
  'receipt_names',
  'first_receipt_date',
  'last_receipt_date',
  'price',
  'sum',
  'updated_at',
  'position_id'
];

const RECEIPTS_HEADERS = [
  'receipt_id',
  'receipt_name',
  'receipt_date',
  'supplier',
  'purchase_order_id',
  'purchase_order_name',
  'product_id',
  'code',
  'product',
  'brand',
  'category',
  'group',
  'quantity',
  'price',
  'sum',
  'updated_at',
  'position_id'
];

const STOCK_SETTINGS_HEADERS = [
  'scope_type',
  'scope_value',
  'stock_days_target',
  'min_stock_qty',
  'max_stock_qty',
  'supplier',
  'lead_time_days',
  'order_pack_qty',
  'active',
  'comment',
  'updated_at'
];

const CARRIER_RULES_HEADERS = [
  'carrier_code',
  'carrier_name',
  'default_transit_days',
  'active',
  'comment',
  'updated_at'
];

const SUPPLIER_CODE_RULES_HEADERS = [
  'supplier_code',
  'supplier_name',
  'active',
  'comment',
  'updated_at'
];

const PURCHASE_DELIVERY_SETTINGS_HEADERS = [
  'order_code',
  'override_transit_days',
  'comment',
  'updated_at'
];

const PURCHASE_ANALYSIS_SETTINGS_HEADERS = [
  'code',
  'product',
  'brand',
  'target_stock_days',
  'manual_order_qty',
  'status_override',
  'comment',
  'updated_at',
  'product_id'
];

const SYSTEM_META_HEADERS = [
  'key',
  'value',
  'updated_at'
];

function nowText() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function withSpreadsheetRetry_(label, fn) {
  const attempts = 3;
  let lastError = null;

  for (var attempt = 1; attempt <= attempts; attempt++) {
    try {
      return fn();
    } catch (e) {
      lastError = e;
      const message = String(e && e.message ? e.message : e);
      const canRetry = /timed out|Service Spreadsheets|internal error|try again/i.test(message);

      if (!canRetry || attempt === attempts) {
        throw e;
      }

      Utilities.sleep(1200 * attempt);
    }
  }

  throw lastError;
}

function getOrCreateSheet(sheetName) {
  return withSpreadsheetRetry_('getOrCreateSheet: ' + sheetName, function() {
    const ss = getSpreadsheet();
    return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  });
}

function ensureHeadersForSheet(sheet, headers) {
  if (!sheet) throw new Error('Sheet is required');
  if (!Array.isArray(headers) || !headers.length) throw new Error('Headers are required');

  return withSpreadsheetRetry_('ensureHeadersForSheet: ' + sheet.getName(), function() {
    const currentLastColumn = sheet.getLastColumn();
    let currentHeaders = [];

    if (currentLastColumn > 0) {
      const width = Math.max(currentLastColumn, headers.length);
      currentHeaders = sheet.getRange(1, 1, 1, width).getValues()[0] || [];
    }

    const isSame = headers.every(function(header, index) {
      return String(currentHeaders[index] || '') === String(header);
    });

    if (!isSame) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Важливо: без autoResizeColumns і важкого форматування.
    // Саме autoResize часто валить RUN_01_setupSheets по timeout у Google Sheets.
    try {
      sheet.setFrozenRows(1);
    } catch (e) {
      Logger.log('setFrozenRows skipped for ' + sheet.getName() + ': ' + e);
    }

    return true;
  });
}

function formatSheetHeader(sheet, columnsCount) {
  if (!sheet || !columnsCount) return;

  return withSpreadsheetRetry_('formatSheetHeader: ' + sheet.getName(), function() {
    try {
      const headerRange = sheet.getRange(1, 1, 1, columnsCount);
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    } catch (e) {
      Logger.log('formatSheetHeader skipped for ' + sheet.getName() + ': ' + e);
    }
  });
}

function applyStockCurrentManualControls_(sheet) {
  if (!sheet) return;

  const statusColumn = STOCK_CURRENT_HEADERS.indexOf('status') + 1;
  const reorderColumn = STOCK_CURRENT_HEADERS.indexOf('reorder_enabled') + 1;
  if (statusColumn <= 0 || reorderColumn <= 0) return;

  return withSpreadsheetRetry_('applyStockCurrentManualControls_: ' + sheet.getName(), function() {
    try {
      const rowsCount = Math.max(sheet.getMaxRows() - 1, 1);
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['new', 'active', 'basic', 'low', 'in archive'], true)
        .setAllowInvalid(false)
        .build();
      const reorderRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['yes', 'no'], true)
        .setAllowInvalid(false)
        .build();

      sheet.getRange(1, statusColumn).setNote('Manual product status: new / active / basic / low / in archive');
      sheet.getRange(1, reorderColumn).setNote('yes = можна рекомендувати до закупки; no = не пропонувати до закупки');
      sheet.getRange(2, statusColumn, rowsCount, 1).setDataValidation(statusRule);
      sheet.getRange(2, reorderColumn, rowsCount, 1).setDataValidation(reorderRule);
    } catch (e) {
      Logger.log('applyStockCurrentManualControls_ skipped: ' + e);
    }
  });
}

function ensureSystemSheet(sheetName, headers) {
  const sheet = getOrCreateSheet(sheetName);
  ensureHeadersForSheet(sheet, headers);
  if (sheetName === SHEET_STOCK_CURRENT) {
    applyStockCurrentManualControls_(sheet);
  }
  return {
    sheet: sheetName,
    status: 'ready',
    headers: headers.length
  };
}

function getSystemMetaSheet() {
  const sheet = getOrCreateSheet(SHEET_SYSTEM_META);
  ensureHeadersForSheet(sheet, SYSTEM_META_HEADERS);
  return sheet;
}

function setSystemMetaValue(key, value) {
  const sheet = getSystemMetaSheet();
  const cleanKey = String(key || '').trim();
  if (!cleanKey) throw new Error('Meta key is required');

  const lastRow = sheet.getLastRow();
  const values = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, SYSTEM_META_HEADERS.length).getValues()
    : [];

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '') === cleanKey) {
      sheet.getRange(i + 2, 2, 1, 2).setValues([[String(value == null ? '' : value), nowText()]]);
      return;
    }
  }

  sheet.appendRow([cleanKey, String(value == null ? '' : value), nowText()]);
}

function getSystemMetaValue(key) {
  const sheet = getSystemMetaSheet();
  const cleanKey = String(key || '').trim();
  if (!cleanKey) return '';

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return '';

  const values = sheet.getRange(2, 1, lastRow - 1, SYSTEM_META_HEADERS.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '') === cleanKey) {
      return String(values[i][1] || '');
    }
  }

  return '';
}

function seedStockSettingsIfEmpty_() {
  const sheet = getOrCreateSheet(SHEET_STOCK_SETTINGS);
  ensureHeadersForSheet(sheet, STOCK_SETTINGS_HEADERS);

  if (sheet.getLastRow() > 1) return 0;

  const rows = [
    ['global', 'all', 30, '', '', '', '', '', 'TRUE', 'Базовий запас на 30 днів для всіх товарів', nowText()],
    ['brand', '', '', '', '', '', '', '', 'TRUE', 'Можна задати запас для окремого бренду', nowText()],
    ['category', '', '', '', '', '', '', '', 'TRUE', 'Можна задати запас для окремої категорії', nowText()],
    ['group', '', '', '', '', '', '', '', 'TRUE', 'Можна задати запас для окремої групи', nowText()],
    ['product', '', '', '', '', '', '', '', 'TRUE', 'Можна задати запас для конкретної позиції', nowText()]
  ];

  sheet.getRange(2, 1, rows.length, STOCK_SETTINGS_HEADERS.length).setValues(rows);
  return rows.length;
}

function seedCarrierRulesIfEmpty_() {
  const sheet = getOrCreateSheet(SHEET_CARRIER_RULES);
  ensureHeadersForSheet(sheet, CARRIER_RULES_HEADERS);

  if (sheet.getLastRow() > 1) return 0;

  const rows = [
    ['A', 'A', 21, 'TRUE', 'Базовий час у дорозі для перевізника', nowText()],
    ['S', 'S', 35, 'TRUE', 'Базовий час у дорозі для перевізника', nowText()],
    ['NKA', 'NKA', 21, 'TRUE', 'Базовий час у дорозі для перевізника', nowText()],
    ['NKS', 'NKS', 80, 'TRUE', 'Базовий час у дорозі для перевізника', nowText()],
    ['SKS', 'SKS', 40, 'TRUE', 'Базовий час у дорозі для перевізника', nowText()],
    ['SKR', 'SKR', '', 'TRUE', 'Заповни типовий час у дорозі для перевізника', nowText()],
    ['OL', 'OL', 90, 'TRUE', 'Базовий час у дорозі для перевізника', nowText()]
  ];

  sheet.getRange(2, 1, rows.length, CARRIER_RULES_HEADERS.length).setValues(rows);
  return rows.length;
}

function seedSupplierCodeRulesIfEmpty_() {
  const sheet = getOrCreateSheet(SHEET_SUPPLIER_CODE_RULES);
  ensureHeadersForSheet(sheet, SUPPLIER_CODE_RULES_HEADERS);

  if (sheet.getLastRow() > 1) return 0;

  const rows = [
    ['H', 'HOCO', 'TRUE', 'Код з номера замовлення, наприклад NKS-140426-H', nowText()]
  ];

  sheet.getRange(2, 1, rows.length, SUPPLIER_CODE_RULES_HEADERS.length).setValues(rows);
  return rows.length;
}

function seedPurchaseDeliverySettingsIfEmpty_() {
  const sheet = getOrCreateSheet(SHEET_PURCHASE_DELIVERY_SETTINGS);
  ensureHeadersForSheet(sheet, PURCHASE_DELIVERY_SETTINGS_HEADERS);

  if (sheet.getLastRow() > 1) return 0;

  const rows = [
    ['NKS-140426-H', '', 'Виняток: якщо для конкретного замовлення час у дорозі інший, він має пріоритет над carrier_rules', nowText()]
  ];

  sheet.getRange(2, 1, rows.length, PURCHASE_DELIVERY_SETTINGS_HEADERS.length).setValues(rows);
  return rows.length;
}

function RUN_01_setupSheets() {
  const reports = [
    ensureSystemSheet(SHEET_STOCK_CURRENT, STOCK_CURRENT_HEADERS),
    ensureSystemSheet(SHEET_SALES_HISTORY, SALES_HISTORY_HEADERS),
    ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS),
    ensureSystemSheet(SHEET_RECEIPTS, RECEIPTS_HEADERS),
    ensureSystemSheet(SHEET_STOCK_SETTINGS, STOCK_SETTINGS_HEADERS),
    ensureSystemSheet(SHEET_CARRIER_RULES, CARRIER_RULES_HEADERS),
    ensureSystemSheet(SHEET_SUPPLIER_CODE_RULES, SUPPLIER_CODE_RULES_HEADERS),
    ensureSystemSheet(SHEET_PURCHASE_DELIVERY_SETTINGS, PURCHASE_DELIVERY_SETTINGS_HEADERS),
    ensureSystemSheet(SHEET_PURCHASE_ANALYSIS_SETTINGS, PURCHASE_ANALYSIS_SETTINGS_HEADERS),
    ensureSystemSheet(SHEET_SYSTEM_META, SYSTEM_META_HEADERS)
  ];

  const seededSettings = seedStockSettingsIfEmpty_();
  const seededCarriers = seedCarrierRulesIfEmpty_();
  const seededSuppliers = seedSupplierCodeRulesIfEmpty_();
  const seededDeliverySettings = seedPurchaseDeliverySettingsIfEmpty_();
  const stockManualColumns = setupStockCurrentManualColumns_();
  setSystemMetaValue('setup_last_run', nowText());
  setSystemMetaValue('dashboard_name', 'Закупки');
  setSystemMetaValue('dashboard_backend_version', 'закупки back 8 sales_history D9 RUN_06 + refresh loop');

  return {
    ok: true,
    version: 'закупки back 8 sales_history D9 RUN_06 + refresh loop',
    spreadsheet_id: getSpreadsheet().getId(),
    sheets: reports,
    seeded_stock_settings_rows: seededSettings,
    seeded_carrier_rules_rows: seededCarriers,
    seeded_supplier_code_rules_rows: seededSuppliers,
    seeded_purchase_delivery_settings_rows: seededDeliverySettings,
    stock_manual_columns: stockManualColumns,
    completed_at: nowText()
  };
}

function RUN_02_getSetupState() {
  const ss = getSpreadsheet();
  const expected = [
    { sheet: SHEET_STOCK_CURRENT, headers: STOCK_CURRENT_HEADERS },
    { sheet: SHEET_SALES_HISTORY, headers: SALES_HISTORY_HEADERS },
    { sheet: SHEET_PURCHASE_ORDERS, headers: PURCHASE_ORDERS_HEADERS },
    { sheet: SHEET_RECEIPTS, headers: RECEIPTS_HEADERS },
    { sheet: SHEET_STOCK_SETTINGS, headers: STOCK_SETTINGS_HEADERS },
    { sheet: SHEET_CARRIER_RULES, headers: CARRIER_RULES_HEADERS },
    { sheet: SHEET_SUPPLIER_CODE_RULES, headers: SUPPLIER_CODE_RULES_HEADERS },
    { sheet: SHEET_PURCHASE_DELIVERY_SETTINGS, headers: PURCHASE_DELIVERY_SETTINGS_HEADERS },
    { sheet: SHEET_PURCHASE_ANALYSIS_SETTINGS, headers: PURCHASE_ANALYSIS_SETTINGS_HEADERS },
    { sheet: SHEET_SYSTEM_META, headers: SYSTEM_META_HEADERS }
  ];

  return {
    ok: true,
    spreadsheet_id: ss.getId(),
    setup_last_run: getSystemMetaValue('setup_last_run'),
    sheets: expected.map(function(item) {
      const sheet = ss.getSheetByName(item.sheet);
      return {
        sheet: item.sheet,
        exists: !!sheet,
        rows: sheet ? sheet.getLastRow() : 0,
        columns: sheet ? sheet.getLastColumn() : 0,
        expected_headers: item.headers.length
      };
    })
  };
}

// --------------------------------------------------
// MOYSKLAD API
// --------------------------------------------------

const MOYSKLAD_STOCK_LIMIT = 1000;
const MOYSKLAD_ENTITY_LIMIT = 100;
const MOYSKLAD_ASSORTMENT_LIMIT = 1000;
const PURCHASE_DOCS_LOOKBACK_MONTHS = 6;
// Активні замовлення можуть їхати довше за поточний місяць.
// Цей ширший період використовується тільки для merge-оновлення purchase_orders,
// щоб відновлювати старі "в дорозі" й не затирати архівні рядки.
const PURCHASE_OPEN_ORDERS_LOOKBACK_MONTHS = 12;
const DEMAND_LIMIT = 25;
const DEMAND_FETCH_SLEEP_MS = 1200;
const PURCHASES_REFRESH_LOOP_HANDLER = 'purchasesSchedulerTick_';
const PURCHASES_REFRESH_LOOP_META_PREFIX = 'purchases_refresh_loop_';
const PURCHASES_REFRESH_LOOP_STALE_TASK_MS = 10 * 60 * 1000;
const PURCHASES_REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY = 'purchases_refresh_loop_cycle_completed_at';
const PURCHASES_REFRESH_LOOP_CYCLE_COUNTER_KEY = 'purchases_refresh_loop_cycle_counter';

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

function buildQuery(params) {
  const pairs = [];
  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];
    if (value !== null && value !== undefined && String(value).length > 0) {
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    }
  });
  return pairs.join('&');
}

function fetchJsonUrl(url, headers) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: headers || {},
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('HTTP error ' + code + '\n' + text);
  }

  return JSON.parse(text);
}

function apiGet(url) {
  return fetchJsonUrl(url, {
    Authorization: 'Bearer ' + getMoySkladToken(),
    Accept: 'application/json;charset=utf-8',
    'Content-Type': 'application/json;charset=utf-8'
  });
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

function normalizeCell(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function isTruthyCell(value) {
  const text = normalizeCell(value).toLowerCase();
  return text === 'true' || text === '1' || text === 'yes' || text === 'y' || text === 'так';
}

function normalizeStockManualStatus_(value) {
  const text = normalizeCell(value).toLowerCase();
  const map = {
    new: 'new',
    active: 'active',
    basic: 'basic',
    low: 'low',
    'in archive': 'in archive',
    archive: 'in archive',
    archived: 'in archive'
  };
  return map[text] || '';
}

function normalizeReorderEnabled_(value) {
  const text = normalizeCell(value).toLowerCase();
  if (text === 'yes' || text === 'y' || text === 'true' || text === '1' || text === 'так') return 'yes';
  if (text === 'no' || text === 'n' || text === 'false' || text === '0' || text === 'ні') return 'no';
  return '';
}

function getDefaultReorderEnabledForStatus_(status) {
  const clean = normalizeStockManualStatus_(status);
  if (clean === 'in archive' || clean === 'low') return 'no';
  return 'yes';
}

function buildStockManualKey_(row) {
  const productId = normalizeCell(row && row.product_id);
  if (productId) return 'id::' + productId;

  const code = normalizeCell(row && row.code).toUpperCase();
  if (code) return 'code::' + code;
  return '';
}

function getExistingStockManualMap_() {
  const sheet = getSpreadsheet().getSheetByName(SHEET_STOCK_CURRENT);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return {};

  const width = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map(function(header) {
    return normalizeCell(header);
  });
  const index = {};
  headers.forEach(function(header, i) {
    if (header) index[header] = i;
  });

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  const map = {};
  values.forEach(function(row) {
    const item = {
      product_id: index.product_id >= 0 ? row[index.product_id] : '',
      code: index.code >= 0 ? row[index.code] : '',
      status: index.status >= 0 ? row[index.status] : '',
      reorder_enabled: index.reorder_enabled >= 0 ? row[index.reorder_enabled] : ''
    };
    const key = buildStockManualKey_(item);
    if (!key) return;
    const status = normalizeStockManualStatus_(item.status);
    const reorder = normalizeReorderEnabled_(item.reorder_enabled);
    if (status || reorder) {
      map[key] = {
        status: status,
        reorder_enabled: reorder
      };
    }
  });
  return map;
}

function money(value) {
  return Number(value || 0) / 100;
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function padSku(value) {
  const digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (!digits) return normalizeCell(value);
  return digits.padStart(5, '0').slice(-5);
}

function momentToMonth(moment) {
  if (!moment) return '';
  const match = /^(\d{4})-(\d{2})-/.exec(String(moment));
  if (!match) return '';
  return match[2] + '.' + match[1].slice(2);
}

function formatDateOnly_(date) {
  if (!date || Object.prototype.toString.call(date) !== '[object Date]' || isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function parseDateFromDdMmYy_(value) {
  const text = normalizeCell(value);
  const match = /^(\d{2})(\d{2})(\d{2})$/.exec(text);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function addDays_(date, days) {
  if (!date || !isFinite(Number(days))) return null;
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + Number(days));
  return out;
}

function parseIsoDateOnly_(value) {
  const text = normalizeCell(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function diffDaysIso(fromIso, toIso) {
  const fromDate = parseIsoDateOnly_(fromIso);
  const toDate = parseIsoDateOnly_(toIso);
  if (!fromDate || !toDate) return '';

  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function formatDateTimeForMoySklad_(date) {
  if (!date || Object.prototype.toString.call(date) !== '[object Date]' || isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function normalizeMomentTextForCompare_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return formatDateTimeForMoySklad_(value);
  }

  const text = normalizeCell(value);
  if (!text) return '';

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (isoMatch) {
    return isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3] + ' ' +
      (isoMatch[4] || '00') + ':' + (isoMatch[5] || '00') + ':' + (isoMatch[6] || '00');
  }

  const slashMatch = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (slashMatch) {
    const day = String(slashMatch[1]).padStart(2, '0');
    const month = String(slashMatch[2]).padStart(2, '0');
    const yearRaw = String(slashMatch[3]);
    const year = yearRaw.length === 2 ? '20' + yearRaw : yearRaw;
    const hh = String(slashMatch[4] || '00').padStart(2, '0');
    const mm = String(slashMatch[5] || '00').padStart(2, '0');
    const ss = String(slashMatch[6] || '00').padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hh + ':' + mm + ':' + ss;
  }

  return text;
}

function getLookbackStartText_(monthsBack) {
  const now = new Date();
  const months = Math.max(1, Number(monthsBack || 1));
  const start = new Date(now.getFullYear(), now.getMonth() - months, now.getDate(), 0, 0, 0);
  return formatDateTimeForMoySklad_(start);
}

function getCurrentMonthRange_() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  return {
    start: formatDateTimeForMoySklad_(start),
    endExclusive: formatDateTimeForMoySklad_(endExclusive),
    month_key: Utilities.formatDate(start, Session.getScriptTimeZone(), 'yyyy-MM')
  };
}

function isMomentInRange_(moment, startText, endTextExclusive) {
  const text = normalizeMomentTextForCompare_(moment);
  const start = normalizeMomentTextForCompare_(startText);
  const end = normalizeMomentTextForCompare_(endTextExclusive);
  if (!text || !start || !end) return false;
  return text >= start && text < end;
}

function joinUrlQuery_(url, params) {
  const query = buildQuery(params);
  if (!query) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + query;
}

function fetchPagedRows_(pathOrUrl, params, limit) {
  const rows = [];
  const baseUrl = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : getApiBase() + pathOrUrl;
  const pageLimit = Math.max(1, Number(limit || MOYSKLAD_ENTITY_LIMIT));
  let offset = 0;

  while (true) {
    const pageParams = {};
    Object.keys(params || {}).forEach(function(key) {
      pageParams[key] = params[key];
    });
    pageParams.limit = pageLimit;
    pageParams.offset = offset;

    const data = apiGet(joinUrlQuery_(baseUrl, pageParams));
    const pageRows = Array.isArray(data && data.rows) ? data.rows : [];
    if (!pageRows.length) break;

    Array.prototype.push.apply(rows, pageRows);
    if (pageRows.length < pageLimit) break;

    offset += pageLimit;
    Utilities.sleep(250);
  }

  return rows;
}

function getEntityId_(entity) {
  const direct = (
    normalizeCell(safeGet(entity, ['id'], '')) ||
    normalizeCell(safeGet(entity, ['meta', 'id'], '')) ||
    normalizeCell(safeGet(entity, ['meta', 'href'], ''))
  );
  return normalizeEntityId_(direct);
}

function normalizeEntityId_(value) {
  const text = normalizeCell(value);
  if (!text) return '';

  const clean = text.split('?')[0];
  const match = /\/entity\/(?:assortment|product|variant|bundle|service|consignment)\/([^/?#]+)/.exec(clean);
  if (match && match[1]) return match[1];

  return clean;
}

function extractAssortmentFromStockRow_(stockRow) {
  return (
    safeGet(stockRow, ['assortment'], null) ||
    safeGet(stockRow, ['meta', 'assortment'], null) ||
    stockRow ||
    {}
  );
}

function extractProductId_(entity) {
  return getEntityId_(entity);
}

function extractProductName_(entity) {
  return normalizeCell(safeGet(entity, ['name'], ''));
}

function extractCode_(entity) {
  return padSku(
    safeGet(entity, ['code'], '') ||
    safeGet(entity, ['article'], '') ||
    safeGet(entity, ['externalCode'], '')
  );
}

function extractUom_(entity) {
  return normalizeCell(
    safeGet(entity, ['uom', 'name'], '') ||
    safeGet(entity, ['uom', 'code'], '')
  );
}

function extractBrandFromAttributes_(entity) {
  const attrs = entity && entity.attributes;
  if (!Array.isArray(attrs)) return '';

  for (var i = 0; i < attrs.length; i++) {
    const attr = attrs[i] || {};
    const name = normalizeCell(attr.name || attr.title || '').toLowerCase();
    if (name !== 'бренд') continue;

    const value = attr.value;
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'object') {
      return normalizeCell(value.name || value.value || value.description || '');
    }
    return normalizeCell(value);
  }

  return '';
}

function extractBrand_(entity) {
  return (
    normalizeCell(safeGet(entity, ['brand', 'name'], '')) ||
    normalizeCell(safeGet(entity, ['manufacturer', 'name'], '')) ||
    extractBrandFromAttributes_(entity)
  );
}

function extractCategory_(entity) {
  return (
    normalizeCell(safeGet(entity, ['productFolder', 'name'], '')) ||
    normalizeCell(safeGet(entity, ['folder', 'name'], '')) ||
    normalizeCell(safeGet(entity, ['group', 'name'], ''))
  );
}

function extractProductGroup_(entity) {
  return (
    normalizeCell(safeGet(entity, ['pathName'], '')) ||
    normalizeCell(safeGet(entity, ['folder', 'pathName'], '')) ||
    extractCategory_(entity)
  );
}

function getDocumentPositions_(document, fallbackPath) {
  const embeddedRows = safeGet(document, ['positions', 'rows'], null);
  if (Array.isArray(embeddedRows)) return embeddedRows;

  const href = normalizeCell(safeGet(document, ['positions', 'meta', 'href'], ''));
  if (href) {
    return fetchPagedRows_(href, { expand: 'assortment' }, MOYSKLAD_ENTITY_LIMIT);
  }

  const id = getEntityId_(document);
  if (!id || !fallbackPath) return [];
  return fetchPagedRows_(getApiBase() + fallbackPath + '/' + id + '/positions', { expand: 'assortment' }, MOYSKLAD_ENTITY_LIMIT);
}

function writeRowsToSheet_(sheetName, headers, rows) {
  const sheet = getOrCreateSheet(sheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  applyTextFormatsForHeaders_(sheet, headers);

  if (rows && rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
  formatSheetHeader(sheet, headers.length);
  return rows ? rows.length : 0;
}

function applyTextFormatsForHeaders_(sheet, headers) {
  if (!sheet || !Array.isArray(headers)) return;

  const textHeaders = {
    product_id: true,
    code: true,
    order_id: true,
    order_name: true,
    receipt_id: true,
    receipt_name: true,
    purchase_order_id: true,
    purchase_order_name: true,
    carrier_code: true,
    supplier_code: true,
    position_id: true,
    month: true,
    date: true,
    order_date: true,
    receipt_date: true,
    ship_date: true,
    calculated_receipt_date: true,
    moysklad_planned_date: true,
    first_receipt_date: true,
    last_receipt_date: true,
    updated_at: true
  };

  const maxRows = Math.max(sheet.getMaxRows(), 1);
  headers.forEach(function(header, index) {
    if (!textHeaders[header]) return;
    try {
      sheet.getRange(1, index + 1, maxRows, 1).setNumberFormat('@');
    } catch (e) {
      Logger.log('text format skipped for ' + sheet.getName() + ' / ' + header + ': ' + e);
    }
  });
}

function getSheetObjects_(sheetName, headers) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const width = headers && headers.length ? headers.length : sheet.getLastColumn();
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  const sourceHeaders = headers && headers.length
    ? headers
    : sheet.getRange(1, 1, 1, width).getValues()[0];

  return values.map(function(row) {
    const item = {};
    sourceHeaders.forEach(function(header, index) {
      item[header] = row[index];
    });
    return item;
  });
}

function buildCarrierRulesLookup_() {
  ensureSystemSheet(SHEET_CARRIER_RULES, CARRIER_RULES_HEADERS);
  seedCarrierRulesIfEmpty_();

  const lookup = {};
  getSheetObjects_(SHEET_CARRIER_RULES, CARRIER_RULES_HEADERS).forEach(function(row) {
    const code = normalizeCell(row.carrier_code).toUpperCase();
    if (!code || !isTruthyCell(row.active)) return;
    lookup[code] = {
      carrier_code: code,
      carrier_name: normalizeCell(row.carrier_name) || code,
      default_transit_days: Number(row.default_transit_days || '')
    };
  });
  return lookup;
}

function buildSupplierCodeRulesLookup_() {
  ensureSystemSheet(SHEET_SUPPLIER_CODE_RULES, SUPPLIER_CODE_RULES_HEADERS);
  seedSupplierCodeRulesIfEmpty_();

  const lookup = {};
  getSheetObjects_(SHEET_SUPPLIER_CODE_RULES, SUPPLIER_CODE_RULES_HEADERS).forEach(function(row) {
    const code = normalizeCell(row.supplier_code).toUpperCase();
    if (!code || !isTruthyCell(row.active)) return;
    lookup[code] = {
      supplier_code: code,
      supplier_name: normalizeCell(row.supplier_name) || code
    };
  });
  return lookup;
}

function buildPurchaseDeliverySettingsLookup_() {
  ensureSystemSheet(SHEET_PURCHASE_DELIVERY_SETTINGS, PURCHASE_DELIVERY_SETTINGS_HEADERS);
  seedPurchaseDeliverySettingsIfEmpty_();

  const lookup = {};
  getSheetObjects_(SHEET_PURCHASE_DELIVERY_SETTINGS, PURCHASE_DELIVERY_SETTINGS_HEADERS).forEach(function(row) {
    const orderCode = normalizeCell(row.order_code).toUpperCase();
    if (!orderCode) return;
    lookup[orderCode] = {
      order_code: orderCode,
      override_transit_days: Number(row.override_transit_days || '')
    };
  });
  return lookup;
}

function parsePurchaseOrderName_(orderName, carrierRules, supplierRules, deliverySettings) {
  const raw = normalizeCell(orderName);
  const match = /^([A-ZА-ЯІЇЄҐ]+)-(\d{6})(?:-([A-ZА-ЯІЇЄҐ0-9]+))?/i.exec(raw);
  const carrierLookup = carrierRules || {};
  const supplierLookup = supplierRules || {};
  const deliveryLookup = deliverySettings || {};

  if (!match) {
    return {
      order_code: raw,
      carrier_code: '',
      carrier_name: '',
      supplier_code: '',
      supplier_name_from_code: '',
      ship_date: '',
      transit_days: '',
      calculated_receipt_date: ''
    };
  }

  const carrierCode = normalizeCell(match[1]).toUpperCase();
  const dateCode = normalizeCell(match[2]);
  const supplierCode = normalizeCell(match[3] || '').toUpperCase();
  const shipDateObj = parseDateFromDdMmYy_(dateCode);
  const carrier = carrierLookup[carrierCode] || { carrier_name: carrierCode, default_transit_days: '' };
  const supplier = supplierCode ? (supplierLookup[supplierCode] || { supplier_name: supplierCode }) : {};
  const manual = deliveryLookup[raw.toUpperCase()] || {};
  const manualTransit = Number(manual.override_transit_days || '');
  const carrierTransit = Number(carrier.default_transit_days || '');
  const transitDays = isFinite(manualTransit) && manualTransit > 0
    ? manualTransit
    : (isFinite(carrierTransit) && carrierTransit > 0 ? carrierTransit : '');
  const receiptDateObj = transitDays !== '' ? addDays_(shipDateObj, transitDays) : null;

  return {
    order_code: raw,
    carrier_code: carrierCode,
    carrier_name: normalizeCell(carrier.carrier_name) || carrierCode,
    supplier_code: supplierCode,
    supplier_name_from_code: normalizeCell(supplier.supplier_name) || supplierCode,
    ship_date: formatDateOnly_(shipDateObj),
    transit_days: transitDays,
    calculated_receipt_date: formatDateOnly_(receiptDateObj)
  };
}

// --------------------------------------------------
// STOCK / ASSORTMENT
// --------------------------------------------------

function fetchStockReportRows_() {
  try {
    return fetchPagedRows_('/report/stock/all', {
      filter: 'stockMode=all;quantityMode=all'
    }, MOYSKLAD_STOCK_LIMIT);
  } catch (e) {
    Logger.log('fetchStockReportRows_ fallback without stock/quantity mode: ' + e);
    return fetchPagedRows_('/report/stock/all', {}, MOYSKLAD_STOCK_LIMIT);
  }
}

function fetchAssortmentRows_() {
  try {
    return fetchPagedRows_('/entity/assortment', {
      expand: 'productFolder,uom'
    }, MOYSKLAD_ASSORTMENT_LIMIT);
  } catch (e) {
    Logger.log('fetchAssortmentRows_ fallback without expand: ' + e);
    return fetchPagedRows_('/entity/assortment', {}, MOYSKLAD_ASSORTMENT_LIMIT);
  }
}

function buildAssortmentLookup_(assortmentRows) {
  const lookup = {};
  (Array.isArray(assortmentRows) ? assortmentRows : []).forEach(function(item) {
    const id = extractProductId_(item);
    if (id) lookup[id] = item;

    const href = normalizeCell(safeGet(item, ['meta', 'href'], ''));
    if (href) lookup[href] = item;
  });
  return lookup;
}

function mergeStockEntity_(stockRow, assortmentLookup) {
  const fromStock = extractAssortmentFromStockRow_(stockRow);
  const id =
    extractProductId_(fromStock) ||
    normalizeCell(safeGet(stockRow, ['meta', 'href'], ''));
  const fromCatalog = id && assortmentLookup ? assortmentLookup[id] : null;

  const merged = {};
  [fromCatalog, fromStock, stockRow].forEach(function(source) {
    if (!source || typeof source !== 'object') return;
    Object.keys(source).forEach(function(key) {
      if (merged[key] === undefined || merged[key] === '') {
        merged[key] = source[key];
      }
    });
  });

  if (!merged.meta && fromStock && fromStock.meta) merged.meta = fromStock.meta;
  return merged;
}

function buildStockCurrentRows_(stockRows, assortmentRows, manualValues) {
  const assortmentLookup = buildAssortmentLookup_(assortmentRows);
  const manualMap = manualValues || {};
  const stockById = {};

  (Array.isArray(stockRows) ? stockRows : []).forEach(function(stockRow) {
    const entity = mergeStockEntity_(stockRow, assortmentLookup);
    const id = extractProductId_(entity);
    if (!id) return;
    stockById[id] = {
      stockRow: stockRow,
      entity: entity
    };
  });

  (Array.isArray(assortmentRows) ? assortmentRows : []).forEach(function(entity) {
    const id = extractProductId_(entity);
    if (!id || stockById[id]) return;
    stockById[id] = {
      stockRow: {},
      entity: entity
    };
  });

  return Object.keys(stockById).map(function(id) {
    const item = stockById[id] || {};
    const stockRow = item.stockRow || {};
    const entity = item.entity || {};
    const stock = Number(safeGet(stockRow, ['stock'], safeGet(stockRow, ['quantity'], 0)) || 0);
    const reserve = Number(safeGet(stockRow, ['reserve'], 0) || 0);
    const available = Number(safeGet(stockRow, ['quantity'], stock - reserve) || 0);
    const expected = Number(safeGet(stockRow, ['inTransit'], safeGet(stockRow, ['expected'], 0)) || 0);
    const code = extractCode_(entity);
    const manual = manualMap['id::' + id] || manualMap['code::' + normalizeCell(code).toUpperCase()] || {};
    const status = normalizeStockManualStatus_(manual.status) || 'new';
    const reorderEnabled = normalizeReorderEnabled_(manual.reorder_enabled) || getDefaultReorderEnabledForStatus_(status);

    return [
      id,
      code,
      extractProductName_(entity),
      extractBrand_(entity),
      extractCategory_(entity),
      extractProductGroup_(entity),
      round2(stock),
      round2(reserve),
      round2(available),
      round2(expected),
      extractUom_(entity),
      round2(money(safeGet(stockRow, ['price'], 0))),
      round2(money(safeGet(stockRow, ['salePrice'], 0))),
      normalizeCell(safeGet(entity, ['supplier', 'name'], '')),
      nowText(),
      status,
      reorderEnabled
    ];
  }).sort(function(a, b) {
    return String(a[2] || '').localeCompare(String(b[2] || ''), 'uk');
  });
}

function refreshStockCurrentNow_() {
  ensureSystemSheet(SHEET_STOCK_CURRENT, STOCK_CURRENT_HEADERS);
  const manualValues = getExistingStockManualMap_();
  const stockRows = fetchStockReportRows_();
  const assortmentRows = fetchAssortmentRows_();
  const rows = buildStockCurrentRows_(stockRows, assortmentRows, manualValues);
  const written = writeRowsToSheet_(SHEET_STOCK_CURRENT, STOCK_CURRENT_HEADERS, rows);
  applyStockCurrentManualControls_(getSpreadsheet().getSheetByName(SHEET_STOCK_CURRENT));
  setSystemMetaValue('stock_current_last_refresh', nowText());
  return {
    ok: true,
    sheet: SHEET_STOCK_CURRENT,
    stock_report_rows: stockRows.length,
    assortment_rows: assortmentRows.length,
    rows_written: written,
    completed_at: nowText()
  };
}

function setupStockCurrentManualColumns_() {
  const sheet = getOrCreateSheet(SHEET_STOCK_CURRENT);
  ensureHeadersForSheet(sheet, STOCK_CURRENT_HEADERS);
  applyTextFormatsForHeaders_(sheet, STOCK_CURRENT_HEADERS);
  applyStockCurrentManualControls_(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      ok: true,
      sheet: SHEET_STOCK_CURRENT,
      rows_checked: 0,
      rows_updated: 0,
      completed_at: nowText()
    };
  }

  const statusColumn = STOCK_CURRENT_HEADERS.indexOf('status') + 1;
  const reorderColumn = STOCK_CURRENT_HEADERS.indexOf('reorder_enabled') + 1;
  const statusRange = sheet.getRange(2, statusColumn, lastRow - 1, 1);
  const reorderRange = sheet.getRange(2, reorderColumn, lastRow - 1, 1);
  const statusValues = statusRange.getValues();
  const reorderValues = reorderRange.getValues();
  let updated = 0;

  for (var i = 0; i < statusValues.length; i++) {
    const currentStatus = normalizeStockManualStatus_(statusValues[i][0]);
    const status = currentStatus || 'new';
    const currentReorder = normalizeReorderEnabled_(reorderValues[i][0]);
    const reorder = currentReorder || getDefaultReorderEnabledForStatus_(status);

    if (statusValues[i][0] !== status) {
      statusValues[i][0] = status;
      updated++;
    }
    if (reorderValues[i][0] !== reorder) {
      reorderValues[i][0] = reorder;
      updated++;
    }
  }

  statusRange.setValues(statusValues);
  reorderRange.setValues(reorderValues);

  return {
    ok: true,
    sheet: SHEET_STOCK_CURRENT,
    rows_checked: statusValues.length,
    cells_updated: updated,
    completed_at: nowText()
  };
}

function updateStockItemManualStatus(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const productId = normalizeCell(source.product_id);
  const sku = normalizeCell(source.sku || source.code);
  const status = normalizeStockManualStatus_(source.status);
  const reorderEnabled = normalizeReorderEnabled_(source.reorder_enabled);

  if (!productId && !sku) throw new Error('Потрібен product_id або sku/code');
  if (!status && !reorderEnabled) throw new Error('Потрібен status або reorder_enabled');

  const sheet = getOrCreateSheet(SHEET_STOCK_CURRENT);
  ensureHeadersForSheet(sheet, STOCK_CURRENT_HEADERS);
  applyStockCurrentManualControls_(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('stock_current порожній');

  const productIdColumn = STOCK_CURRENT_HEADERS.indexOf('product_id') + 1;
  const codeColumn = STOCK_CURRENT_HEADERS.indexOf('code') + 1;
  const statusColumn = STOCK_CURRENT_HEADERS.indexOf('status') + 1;
  const reorderColumn = STOCK_CURRENT_HEADERS.indexOf('reorder_enabled') + 1;
  const values = sheet.getRange(2, 1, lastRow - 1, STOCK_CURRENT_HEADERS.length).getValues();
  let rowIndex = -1;

  for (var i = 0; i < values.length; i++) {
    const rowProductId = normalizeCell(values[i][productIdColumn - 1]);
    const rowCode = normalizeCell(values[i][codeColumn - 1]);
    if ((productId && rowProductId === productId) || (sku && rowCode === sku)) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex < 0) {
    throw new Error('Не знайдено товар у stock_current: ' + (productId || sku));
  }

  const currentStatus = normalizeStockManualStatus_(sheet.getRange(rowIndex, statusColumn).getValue());
  const currentReorder = normalizeReorderEnabled_(sheet.getRange(rowIndex, reorderColumn).getValue());
  const nextStatus = status || currentStatus || 'new';
  const nextReorder = reorderEnabled || (status ? getDefaultReorderEnabledForStatus_(nextStatus) : currentReorder) || getDefaultReorderEnabledForStatus_(nextStatus);

  sheet.getRange(rowIndex, statusColumn, 1, 2).setValues([[nextStatus, nextReorder]]);

  return {
    ok: true,
    row: rowIndex,
    product_id: productId,
    sku: sku,
    status: nextStatus,
    reorder_enabled: nextReorder,
    updated_at: nowText()
  };
}

function RUN_25_setupStockManualColumnsNow() {
  return setupStockCurrentManualColumns_();
}

// --------------------------------------------------
// PURCHASE ORDERS / RECEIPTS
// --------------------------------------------------

function fetchPurchaseOrderDocs_() {
  return fetchPurchaseOrderDocsForPeriod_(
    getLookbackStartText_(PURCHASE_DOCS_LOOKBACK_MONTHS),
    ''
  );
}

function fetchPurchaseOrderDocsForPeriod_(startText, endTextExclusive) {
  const params = {
    expand: 'agent,state,positions.assortment',
    order: 'moment,desc'
  };
  const filters = [];
  if (startText) filters.push('moment>=' + startText);
  if (endTextExclusive) filters.push('moment<' + endTextExclusive);
  if (filters.length) params.filter = filters.join(';');
  return fetchPagedRows_('/entity/purchaseorder', params, MOYSKLAD_ENTITY_LIMIT);
}

function fetchReceiptDocs_() {
  return fetchReceiptDocsForPeriod_(
    getLookbackStartText_(PURCHASE_DOCS_LOOKBACK_MONTHS),
    ''
  );
}

function fetchReceiptDocsForPeriod_(startText, endTextExclusive) {
  const params = {
    expand: 'agent,state,purchaseOrder,positions.assortment',
    order: 'moment,desc'
  };
  const filters = [];
  if (startText) filters.push('moment>=' + startText);
  if (endTextExclusive) filters.push('moment<' + endTextExclusive);
  if (filters.length) params.filter = filters.join(';');
  return fetchPagedRows_('/entity/supply', params, MOYSKLAD_ENTITY_LIMIT);
}

function fetchLinkedPurchaseOrderDocsFromReceipts_(receiptDocs) {
  const seen = {};
  const docs = [];

  (Array.isArray(receiptDocs) ? receiptDocs : []).forEach(function(receiptDoc) {
    const purchaseOrder = safeGet(receiptDoc, ['purchaseOrder'], {}) || {};
    const href = normalizeCell(safeGet(purchaseOrder, ['meta', 'href'], ''));
    const id = getEntityId_(purchaseOrder);
    const key = id || href;
    if (!href || !key || seen[key]) return;
    seen[key] = true;

    try {
      docs.push(apiGet(joinUrlQuery_(href, { expand: 'agent,state,positions.assortment' })));
    } catch (e) {
      Logger.log('fetchLinkedPurchaseOrderDocsFromReceipts_ skipped ' + key + ': ' + e);
    }

    Utilities.sleep(120);
  });

  return docs;
}

function fetchPurchaseOrderDocByReference_(purchaseOrderId, purchaseOrderName) {
  const idOrHref = normalizeCell(purchaseOrderId);
  const name = normalizeCell(purchaseOrderName);

  if (idOrHref) {
    const href = /^https?:\/\//i.test(idOrHref)
      ? idOrHref
      : getApiBase() + '/entity/purchaseorder/' + encodeURIComponent(idOrHref);
    return apiGet(joinUrlQuery_(href, { expand: 'agent,state,positions.assortment' }));
  }

  if (!name) return null;

  const found = fetchPagedRows_('/entity/purchaseorder', {
    filter: 'name=' + name,
    expand: 'agent,state,positions.assortment'
  }, 1);

  return found[0] || null;
}

function buildPurchaseOrderHref_(purchaseOrderIdOrHref) {
  const value = normalizeCell(purchaseOrderIdOrHref);
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return getApiBase() + '/entity/purchaseorder/' + encodeURIComponent(value);
}

function fetchReceiptDocsByPurchaseOrderReference_(purchaseOrderId, purchaseOrderName) {
  const purchaseRows = [{
    order_id: purchaseOrderId,
    order_name: purchaseOrderName,
    quantity_ordered: 1,
    quantity_received: 0,
    quantity_remaining: 1,
    receiving_status: 'in_transit',
    order_date: ''
  }];
  return fetchLinkedReceiptDocsForOpenPurchaseRows_(purchaseRows);
}

function fetchMissingLinkedPurchaseOrderDocsFromReceiptRows_(receiptRows, purchaseRows) {
  const purchaseQtyByKey = {};
  const receiptAggByKey = {};
  const seen = {};
  const docs = [];

  (Array.isArray(purchaseRows) ? purchaseRows : []).forEach(function(row) {
    const orderPart = normalizeCell(row.order_id || row.order_name).toUpperCase();
    const productPart = (
      normalizeCell(row.product_id).toUpperCase() ||
      normalizeCell(row.code).toUpperCase() ||
      normalizeCell(row.product).toUpperCase()
    );
    if (!orderPart || !productPart) return;
    const key = orderPart + '||' + productPart;
    purchaseQtyByKey[key] = round2(Number(purchaseQtyByKey[key] || 0) + Number(row.quantity_ordered || 0));
  });

  (Array.isArray(receiptRows) ? receiptRows : []).forEach(function(row) {
    const purchaseOrderId = normalizeCell(row.purchase_order_id);
    const purchaseOrderName = normalizeCell(row.purchase_order_name);
    if (!purchaseOrderId && !purchaseOrderName) return;

    const orderPart = normalizeCell(purchaseOrderId || purchaseOrderName).toUpperCase();
    const productPart = (
      normalizeCell(row.product_id).toUpperCase() ||
      normalizeCell(row.code).toUpperCase() ||
      normalizeCell(row.product).toUpperCase()
    );
    if (!orderPart || !productPart) return;

    const aggKey = orderPart + '||' + productPart;
    if (!receiptAggByKey[aggKey]) {
      receiptAggByKey[aggKey] = {
        purchase_order_id: purchaseOrderId,
        purchase_order_name: purchaseOrderName,
        quantity: 0
      };
    }
    receiptAggByKey[aggKey].quantity = round2(
      Number(receiptAggByKey[aggKey].quantity || 0) + Number(row.quantity || 0)
    );
  });

  Object.keys(receiptAggByKey).forEach(function(aggKey) {
    const agg = receiptAggByKey[aggKey];
    const purchaseOrderId = normalizeCell(agg.purchase_order_id);
    const purchaseOrderName = normalizeCell(agg.purchase_order_name);
    const orderedQty = Number(purchaseQtyByKey[aggKey] || 0);
    const receivedQty = Number(agg.quantity || 0);

    if (orderedQty > 0 && orderedQty + 0.000001 >= receivedQty) return;

    const key = purchaseOrderId || purchaseOrderName;
    if (!key || seen[key]) return;
    seen[key] = true;

    try {
      const doc = fetchPurchaseOrderDocByReference_(purchaseOrderId, purchaseOrderName);
      if (doc) docs.push(doc);
    } catch (e) {
      Logger.log(
        'fetchMissingLinkedPurchaseOrderDocsFromReceiptRows_ skipped ' +
        (purchaseOrderName || purchaseOrderId) + ': ' + e
      );
    }

    Utilities.sleep(120);
  });

  return docs;
}

function fetchLinkedReceiptDocsForOpenPurchaseRows_(purchaseRows, receiptRows) {
  const purchaseOrderIds = {};
  const purchaseOrderNames = {};
  const receiptSeen = {};
  const docs = [];
  const existingReceiptLookup = buildReceiptLookup_(Array.isArray(receiptRows) ? receiptRows : []);
  let earliestOrderMoment = '';

  (Array.isArray(purchaseRows) ? purchaseRows : []).forEach(function(row) {
    const orderId = normalizeCell(row.order_id);
    const orderName = normalizeCell(row.order_name);
    const ordered = Number(row.quantity_ordered || 0);
    const received = Number(row.quantity_received || 0);
    const remaining = Number(row.quantity_remaining || 0);
    const status = normalizeCell(row.receiving_status);
    const existingReceiptAgg = findReceiptAggregateForPurchaseRow_(row, existingReceiptLookup);
    const existingReceiptQty = existingReceiptAgg ? Number(existingReceiptAgg.quantity || 0) : 0;
    const hasIncompleteReceiptLinks = received > existingReceiptQty + 0.000001;
    const isFullyReceived = remaining <= 0 && ordered > 0 && received + 0.000001 >= ordered && status === 'received';

    if (!orderId && !orderName) return;
    if (isFullyReceived && !hasIncompleteReceiptLinks) return;

    if (orderId) purchaseOrderIds[orderId] = true;
    if (orderName) purchaseOrderNames[orderName] = true;

    const orderMoment = normalizeMomentTextForCompare_(row.order_date);
    if (orderMoment && (!earliestOrderMoment || orderMoment < earliestOrderMoment)) {
      earliestOrderMoment = orderMoment;
    }
  });

  if (!Object.keys(purchaseOrderIds).length && !Object.keys(purchaseOrderNames).length) return docs;

  const startText = earliestOrderMoment || getLookbackStartText_(PURCHASE_DOCS_LOOKBACK_MONTHS);
  const receiptDocs = fetchReceiptDocsForPeriod_(startText, '');

  receiptDocs.forEach(function(doc) {
    const purchaseOrder = safeGet(doc, ['purchaseOrder'], {}) || {};
    const purchaseOrderId = getEntityId_(purchaseOrder);
    const purchaseOrderName = normalizeCell(purchaseOrder.name);

    if (
      !(purchaseOrderId && purchaseOrderIds[purchaseOrderId]) &&
      !(purchaseOrderName && purchaseOrderNames[purchaseOrderName])
    ) {
      return;
    }

    const receiptId = getEntityId_(doc) || normalizeCell(doc.name);
    if (!receiptId || receiptSeen[receiptId]) return;
    receiptSeen[receiptId] = true;
    docs.push(doc);
  });

  return docs;
}

function aggregateRowsByKey_(rows, headers, buildKey, sumHeaders) {
  const idx = getHeaderIndexMap_(headers);
  const byKey = {};
  const order = [];
  const sumMap = {};
  (Array.isArray(sumHeaders) ? sumHeaders : []).forEach(function(header) {
    sumMap[header] = true;
  });

  (Array.isArray(rows) ? rows : []).forEach(function(row) {
    const normalizedRow = headers.map(function(header, index) {
      return row[index] == null ? '' : row[index];
    });
    const key = buildKey(normalizedRow, idx);
    if (!key) return;

    if (!byKey[key]) {
      byKey[key] = normalizedRow;
      order.push(key);
      return;
    }

    const target = byKey[key];
    Object.keys(sumMap).forEach(function(header) {
      const column = idx[header];
      if (column === undefined) return;
      target[column] = round2(Number(target[column] || 0) + Number(normalizedRow[column] || 0));
    });
  });

  return order.map(function(key) { return byKey[key]; });
}

function buildPurchaseOrderRowKeyFromParts_(idx, row) {
  const orderId = normalizeCell(row[idx.order_id]).toUpperCase();
  const orderName = normalizeCell(row[idx.order_name]).toUpperCase();
  const positionId = idx.position_id === undefined ? '' : normalizeCell(row[idx.position_id]).toUpperCase();
  const productId = normalizeCell(row[idx.product_id]).toUpperCase();
  const code = normalizeCell(row[idx.code]).toUpperCase();
  const product = normalizeCell(row[idx.product]).toUpperCase();
  const orderPart = orderId || orderName;
  if (orderPart && positionId) return orderPart + '||position::' + positionId;
  const productPart = productId || code || product;
  if (!orderPart || !productPart) return '';
  return orderPart + '||' + productPart;
}

function buildReceiptRowKeyFromParts_(idx, row) {
  const receiptId = normalizeCell(row[idx.receipt_id]).toUpperCase();
  const receiptName = normalizeCell(row[idx.receipt_name]).toUpperCase();
  const purchaseOrderId = normalizeCell(row[idx.purchase_order_id]).toUpperCase();
  const purchaseOrderName = normalizeCell(row[idx.purchase_order_name]).toUpperCase();
  const positionId = idx.position_id === undefined ? '' : normalizeCell(row[idx.position_id]).toUpperCase();
  const productId = normalizeCell(row[idx.product_id]).toUpperCase();
  const code = normalizeCell(row[idx.code]).toUpperCase();
  const product = normalizeCell(row[idx.product]).toUpperCase();
  const receiptPart = receiptId || receiptName;
  const orderPart = purchaseOrderId || purchaseOrderName;
  if (receiptPart && positionId) return receiptPart + '||position::' + positionId;
  const productPart = productId || code || product;
  if (!receiptPart || !orderPart || !productPart) return '';
  return receiptPart + '||' + orderPart + '||' + productPart;
}

function aggregatePurchaseOrderDuplicateRows_(rows) {
  return aggregateRowsByKey_(
    rows,
    PURCHASE_ORDERS_HEADERS,
    function(row, idx) { return buildPurchaseOrderRowKeyFromParts_(idx, row); },
    ['quantity_ordered', 'quantity_received', 'quantity_remaining', 'sum']
  );
}

function aggregateReceiptDuplicateRows_(rows) {
  return aggregateRowsByKey_(
    rows,
    RECEIPTS_HEADERS,
    function(row, idx) { return buildReceiptRowKeyFromParts_(idx, row); },
    ['quantity', 'sum']
  );
}

function buildPurchaseOrderRows_(docs) {
  const out = [];
  const updatedAt = nowText();
  const carrierRules = buildCarrierRulesLookup_();
  const supplierRules = buildSupplierCodeRulesLookup_();
  const deliverySettings = buildPurchaseDeliverySettingsLookup_();

  (Array.isArray(docs) ? docs : []).forEach(function(doc) {
    const positions = getDocumentPositions_(doc, '/entity/purchaseorder');
    const orderId = getEntityId_(doc);
    const orderName = normalizeCell(doc.name);
    const orderMeta = parsePurchaseOrderName_(orderName, carrierRules, supplierRules, deliverySettings);
    const orderDate = normalizeCell(doc.moment);
    const supplier = normalizeCell(safeGet(doc, ['agent', 'name'], ''));
    const status = normalizeCell(safeGet(doc, ['state', 'name'], ''));
    const plannedDate = normalizeCell(
      safeGet(doc, ['deliveryPlannedMoment'], '') ||
      safeGet(doc, ['plannedDate'], '') ||
      safeGet(doc, ['applicableMoment'], '')
    );

    positions.forEach(function(pos) {
      const entity = safeGet(pos, ['assortment'], {}) || {};
      const quantityOrdered = Number(pos.quantity || 0);
      const quantityReceived = Number(
        safeGet(pos, ['shipped'], safeGet(pos, ['supplied'], safeGet(pos, ['received'], 0))) || 0
      );
      const quantityRemaining = Math.max(0, quantityOrdered - quantityReceived);
      const price = round2(money(pos.price));
      const sum = round2(money(pos.sum) || quantityOrdered * price);

      out.push([
        orderId,
        orderName,
        orderMeta.carrier_code,
        orderMeta.carrier_name,
        orderMeta.supplier_code,
        orderMeta.supplier_name_from_code,
        orderMeta.ship_date,
        orderMeta.transit_days,
        orderMeta.calculated_receipt_date,
        orderDate,
        supplier,
        status,
        plannedDate,
        extractProductId_(entity),
        extractCode_(entity),
        extractProductName_(entity),
        extractBrand_(entity),
        extractCategory_(entity),
        extractProductGroup_(entity),
        round2(quantityOrdered),
        round2(quantityReceived),
        round2(quantityRemaining),
        'in_transit',
        '',
        '',
        '',
        price,
        sum,
        updatedAt,
        extractPositionId_(pos)
      ]);
    });
  });

  return aggregatePurchaseOrderDuplicateRows_(out);
}

function buildReceiptRows_(docs) {
  const out = [];
  const updatedAt = nowText();

  (Array.isArray(docs) ? docs : []).forEach(function(doc) {
    const positions = getDocumentPositions_(doc, '/entity/supply');
    const receiptId = getEntityId_(doc);
    const receiptName = normalizeCell(doc.name);
    const receiptDate = normalizeCell(doc.moment);
    const supplier = normalizeCell(safeGet(doc, ['agent', 'name'], ''));
    const purchaseOrder = safeGet(doc, ['purchaseOrder'], {}) || {};

    positions.forEach(function(pos) {
      const entity = safeGet(pos, ['assortment'], {}) || {};
      const quantity = Number(pos.quantity || 0);
      const price = round2(money(pos.price));
      const sum = round2(money(pos.sum) || quantity * price);

      out.push([
        receiptId,
        receiptName,
        receiptDate,
        supplier,
        extractProductId_(purchaseOrder),
        normalizeCell(purchaseOrder.name),
        extractProductId_(entity),
        extractCode_(entity),
        extractProductName_(entity),
        extractBrand_(entity),
        extractCategory_(entity),
        extractProductGroup_(entity),
        round2(quantity),
        price,
        sum,
        updatedAt,
        extractPositionId_(pos)
      ]);
    });
  });

  return aggregateReceiptDuplicateRows_(out);
}


// --------------------------------------------------
// PURCHASE ORDER ↔ RECEIPT RECONCILIATION
// --------------------------------------------------

function getHeaderIndexMap_(headers) {
  const map = {};
  (Array.isArray(headers) ? headers : []).forEach(function(header, index) {
    map[header] = index;
  });
  return map;
}

function normalizeReceiptKeyPart_(value) {
  return normalizeCell(value).toUpperCase();
}

function buildReceiptMatchKeys_(purchaseOrderId, purchaseOrderName, productId, code) {
  const orderId = normalizeReceiptKeyPart_(purchaseOrderId);
  const orderName = normalizeReceiptKeyPart_(purchaseOrderName);
  const product = normalizeReceiptKeyPart_(productId);
  const sku = normalizeReceiptKeyPart_(code);
  const keys = [];
  const seen = {};

  function add(orderPart, productPart, priority) {
    if (!orderPart || !productPart) return;
    const key = orderPart + '||' + productPart;
    if (seen[key]) return;
    seen[key] = true;
    keys.push({ key: key, priority: priority });
  }

  // Найточніші ключі першими: ID замовлення + ID товару.
  add(orderId, product, 1);
  add(orderName, product, 2);
  add(orderId, sku, 3);
  add(orderName, sku, 4);

  return keys;
}

function addReceiptAggregate_(lookup, key, receiptRow) {
  if (!key) return;

  if (!lookup[key]) {
    lookup[key] = {
      quantity: 0,
      receipt_names: [],
      receipt_names_seen: {},
      first_receipt_date: '',
      last_receipt_date: ''
    };
  }

  const item = lookup[key];
  const qty = Number(receiptRow.quantity || 0);
  const receiptName = normalizeCell(receiptRow.receipt_name);
  const receiptDate = normalizeCell(receiptRow.receipt_date);

  item.quantity = round2(Number(item.quantity || 0) + qty);

  if (receiptName && !item.receipt_names_seen[receiptName]) {
    item.receipt_names_seen[receiptName] = true;
    item.receipt_names.push(receiptName);
  }

  if (receiptDate) {
    if (!item.first_receipt_date || receiptDate < item.first_receipt_date) {
      item.first_receipt_date = receiptDate;
    }
    if (!item.last_receipt_date || receiptDate > item.last_receipt_date) {
      item.last_receipt_date = receiptDate;
    }
  }
}

function buildReceiptLookup_(receiptRows) {
  const lookup = {};

  (Array.isArray(receiptRows) ? receiptRows : []).forEach(function(row) {
    const keys = buildReceiptMatchKeys_(
      row.purchase_order_id,
      row.purchase_order_name,
      row.product_id,
      row.code
    );

    keys.forEach(function(item) {
      addReceiptAggregate_(lookup, item.key, row);
    });
  });

  return lookup;
}

function findReceiptAggregateMatchForPurchaseRow_(purchaseRow, receiptLookup) {
  const keys = buildReceiptMatchKeys_(
    purchaseRow.order_id,
    purchaseRow.order_name,
    purchaseRow.product_id,
    purchaseRow.code
  );

  for (var i = 0; i < keys.length; i++) {
    const found = receiptLookup[keys[i].key];
    if (found) return { key: keys[i].key, aggregate: found };
  }

  return null;
}

function findReceiptAggregateForPurchaseRow_(purchaseRow, receiptLookup) {
  const match = findReceiptAggregateMatchForPurchaseRow_(purchaseRow, receiptLookup);
  return match ? match.aggregate : null;
}

function getReceivingStatus_(quantityOrdered, quantityReceived) {
  const ordered = Number(quantityOrdered || 0);
  const received = Number(quantityReceived || 0);
  const eps = 0.000001;

  if (ordered <= eps && received <= eps) return 'empty';
  if (received <= eps) return 'in_transit';
  if (received + eps < ordered) return 'partially_received';
  if (received > ordered + eps) return 'over_received';
  return 'received';
}

function reconcilePurchaseRowsWithReceipts_(purchaseRows, receiptRows) {
  const receiptLookup = buildReceiptLookup_(receiptRows);
  const purchaseIndex = getHeaderIndexMap_(PURCHASE_ORDERS_HEADERS);
  const normalizedRows = [];
  const rowObjects = [];
  const receiptGroups = {};
  const reconciledIndexes = {};

  (Array.isArray(purchaseRows) ? purchaseRows : []).forEach(function(row, rowIndex) {
    const normalizedRow = PURCHASE_ORDERS_HEADERS.map(function(header, index) {
      return row[index] == null ? '' : row[index];
    });

    const purchaseObj = {};
    PURCHASE_ORDERS_HEADERS.forEach(function(header, index) {
      purchaseObj[header] = normalizedRow[index];
    });

    const match = findReceiptAggregateMatchForPurchaseRow_(purchaseObj, receiptLookup);
    if (match) {
      if (!receiptGroups[match.key]) {
        receiptGroups[match.key] = {
          aggregate: match.aggregate,
          indexes: []
        };
      }
      receiptGroups[match.key].indexes.push(rowIndex);
    }

    normalizedRows.push(normalizedRow);
    rowObjects.push(purchaseObj);
  });

  Object.keys(receiptGroups).forEach(function(groupKey) {
    const group = receiptGroups[groupKey];
    let receiptQtyLeft = Number(group.aggregate.quantity || 0);
    const indexes = group.indexes;

    indexes.forEach(function(rowIndex, groupIndex) {
      const normalizedRow = normalizedRows[rowIndex];
      const purchaseObj = rowObjects[rowIndex];
      const ordered = Number(purchaseObj.quantity_ordered || 0);
      const sourceReceived = Math.max(0, Number(purchaseObj.quantity_received || 0));
      const receiptReceived = Math.min(Math.max(0, receiptQtyLeft), ordered);
      let receiptReceivedForRow = receiptReceived;
      let received = Math.max(sourceReceived, receiptReceivedForRow);

      receiptQtyLeft = round2(receiptQtyLeft - receiptReceived);

      if (groupIndex === indexes.length - 1 && receiptQtyLeft > 0) {
        receiptReceivedForRow = round2(receiptReceivedForRow + receiptQtyLeft);
        received = Math.max(sourceReceived, receiptReceivedForRow);
        receiptQtyLeft = 0;
      }

      const remaining = Math.max(0, ordered - received);
      const status = getReceivingStatus_(ordered, received);

      reconciledIndexes[rowIndex] = true;
      normalizedRow[purchaseIndex.quantity_received] = round2(received);
      normalizedRow[purchaseIndex.quantity_remaining] = round2(remaining);
      normalizedRow[purchaseIndex.receiving_status] = status;
      normalizedRow[purchaseIndex.receipt_names] = group.aggregate.receipt_names.join(', ');
      normalizedRow[purchaseIndex.first_receipt_date] = group.aggregate.first_receipt_date;
      normalizedRow[purchaseIndex.last_receipt_date] = group.aggregate.last_receipt_date;
      normalizedRow[purchaseIndex.updated_at] = nowText();
    });
  });

  return normalizedRows.map(function(normalizedRow, rowIndex) {
    const purchaseObj = rowObjects[rowIndex];
    if (reconciledIndexes[rowIndex]) return normalizedRow;

    const ordered = Number(purchaseObj.quantity_ordered || 0);
    const received = Math.max(0, Number(purchaseObj.quantity_received || 0));
    const remaining = Math.max(0, ordered - received);
    const status = getReceivingStatus_(ordered, received);

    normalizedRow[purchaseIndex.quantity_received] = round2(received);
    normalizedRow[purchaseIndex.quantity_remaining] = round2(remaining);
    normalizedRow[purchaseIndex.receiving_status] = status;
    normalizedRow[purchaseIndex.receipt_names] = '';
    normalizedRow[purchaseIndex.first_receipt_date] = '';
    normalizedRow[purchaseIndex.last_receipt_date] = '';
    normalizedRow[purchaseIndex.updated_at] = nowText();

    return normalizedRow;
  });
}

function reconcilePurchaseOrdersSheetWithReceipts_() {
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  ensureSystemSheet(SHEET_RECEIPTS, RECEIPTS_HEADERS);

  const purchaseObjects = getSheetObjects_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const receiptObjects = getSheetObjects_(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  const purchaseRows = purchaseObjects.map(function(row) {
    return PURCHASE_ORDERS_HEADERS.map(function(header) {
      return row[header] == null ? '' : row[header];
    });
  });

  const reconciledRows = reconcilePurchaseRowsWithReceipts_(purchaseRows, receiptObjects);
  const written = writeRowsToSheet_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS, reconciledRows);

  const summary = buildPurchaseReceivingSummaryFromRows_(reconciledRows);
  setSystemMetaValue('purchase_receiving_last_reconcile', nowText());

  return {
    ok: true,
    sheet: SHEET_PURCHASE_ORDERS,
    purchase_rows: purchaseRows.length,
    receipt_rows: receiptObjects.length,
    rows_written: written,
    summary: summary,
    completed_at: nowText()
  };
}

function buildPurchaseReceivingSummaryFromRows_(purchaseRows) {
  const idx = getHeaderIndexMap_(PURCHASE_ORDERS_HEADERS);
  const summary = {
    in_transit: 0,
    partially_received: 0,
    received: 0,
    over_received: 0,
    empty: 0,
    expected_qty: 0,
    received_qty: 0,
    ordered_qty: 0
  };

  (Array.isArray(purchaseRows) ? purchaseRows : []).forEach(function(row) {
    const status = normalizeCell(row[idx.receiving_status]) || 'in_transit';
    if (summary[status] === undefined) summary[status] = 0;
    summary[status] += 1;
    summary.ordered_qty = round2(summary.ordered_qty + Number(row[idx.quantity_ordered] || 0));
    summary.received_qty = round2(summary.received_qty + Number(row[idx.quantity_received] || 0));
    summary.expected_qty = round2(summary.expected_qty + Number(row[idx.quantity_remaining] || 0));
  });

  return summary;
}

function buildPurchaseOrderStatusRows_(purchaseOrders) {
  const byOrder = {};

  (Array.isArray(purchaseOrders) ? purchaseOrders : []).forEach(function(row) {
    const orderKey = normalizeCell(row.order_id) || normalizeCell(row.order_name);
    if (!orderKey) return;

    if (!byOrder[orderKey]) {
      byOrder[orderKey] = {
        order_id: normalizeCell(row.order_id),
        order_name: normalizeCell(row.order_name),
        carrier_code: normalizeCell(row.carrier_code),
        carrier_name: normalizeCell(row.carrier_name),
        supplier: normalizeCell(row.supplier),
        order_date: normalizeCell(row.order_date),
        calculated_receipt_date: normalizeCell(row.calculated_receipt_date),
        moysklad_planned_date: normalizeCell(row.moysklad_planned_date),
        quantity_ordered: 0,
        quantity_received: 0,
        quantity_remaining: 0,
        receipt_names: [],
        receipt_names_seen: {},
        first_receipt_date: '',
        last_receipt_date: '',
        positions_total: 0,
        positions_expected: 0,
        receiving_status: 'in_transit'
      };
    }

    const item = byOrder[orderKey];
    item.quantity_ordered = round2(item.quantity_ordered + Number(row.quantity_ordered || 0));
    item.quantity_received = round2(item.quantity_received + Number(row.quantity_received || 0));
    item.quantity_remaining = round2(item.quantity_remaining + Number(row.quantity_remaining || 0));
    item.positions_total += 1;
    if (Number(row.quantity_remaining || 0) > 0) item.positions_expected += 1;

    const receiptNames = normalizeCell(row.receipt_names).split(',').map(function(name) {
      return normalizeCell(name);
    }).filter(Boolean);

    receiptNames.forEach(function(name) {
      if (item.receipt_names_seen[name]) return;
      item.receipt_names_seen[name] = true;
      item.receipt_names.push(name);
    });

    const firstDate = normalizeCell(row.first_receipt_date);
    const lastDate = normalizeCell(row.last_receipt_date);
    if (firstDate && (!item.first_receipt_date || firstDate < item.first_receipt_date)) item.first_receipt_date = firstDate;
    if (lastDate && (!item.last_receipt_date || lastDate > item.last_receipt_date)) item.last_receipt_date = lastDate;
  });

  const rows = Object.keys(byOrder).map(function(key) {
    const item = byOrder[key];
    item.receiving_status = getReceivingStatus_(item.quantity_ordered, item.quantity_received);
    item.receipt_names = item.receipt_names.join(', ');
    delete item.receipt_names_seen;
    return item;
  });

  return rows.sort(function(a, b) {
    const dateA = normalizeCell(a.calculated_receipt_date || a.moysklad_planned_date || a.order_date);
    const dateB = normalizeCell(b.calculated_receipt_date || b.moysklad_planned_date || b.order_date);
    return dateA.localeCompare(dateB) || String(a.order_name || '').localeCompare(String(b.order_name || ''), 'uk');
  });
}

// --------------------------------------------------
// SALES HISTORY
// Логіка взята по принципу з основного sales dashboard:
// поточний місяць перезаписується, SKU/brand/group визначаються розумніше,
// рядки дедупляться по order_id + position_id/SKU/product.
// --------------------------------------------------

function extractPositionId_(pos) {
  return (
    normalizeCell(safeGet(pos, ['id'], '')) ||
    normalizeCell(safeGet(pos, ['meta', 'href'], ''))
  );
}

function extractDemandStatus_(demand) {
  return normalizeCell(safeGet(demand, ['state', 'name'], ''));
}

function extractSalesSku_(assortment) {
  return extractCode_(assortment);
}

function getBusinessCategoryMap_() {
  return {
    'Чохли': [
      'Чохли для iPad',
      'Чохли для iPhone',
      'Чохли для Samsung',
      'Чохли для MacBook',
      'Чохли для AirPods',
      'Чохли для AirTag',
      'Ремінці для Apple Watch',
      'Шнурки для iPhone',
      'Сумки для аксесуарів'
    ],
    'Захисне скло | плівки': [
      'Захисне скло для iPad',
      'Захисне скло для iPhone',
      'Захисне скло для Samsung',
      'Захисне скло для Apple Watch',
      'Захисне скло для камери iPhone',
      'Захисне скло для камери Samsung',
      'Захисні плівки для iPad',
      'Захисні плівки для MacBook'
    ],
    'Зарядні пристрої': [
      'Бездротові зарядки',
      'Кабелі',
      'Адаптери',
      'PowerBank',
      'Зарядки для Ноутбуків',
      'Зарядні для Apple Watch'
    ],
    'Інші Аксесуари': [
      'Автотримачі',
      'Прикурювачі',
      'Навушники',
      'Pencil',
      'Кабелі - перехідники',
      'Перехідники/USB-C аксесуари',
      'Перехідники для розетки',
      'Інші Аксесуари'
    ]
  };
}

function getBusinessGroupToCategoryMap_() {
  if (getBusinessGroupToCategoryMap_._cache) return getBusinessGroupToCategoryMap_._cache;

  const base = {};
  const catMap = getBusinessCategoryMap_();

  Object.keys(catMap).forEach(function(category) {
    catMap[category].forEach(function(group) {
      base[normalizeCell(group).toLowerCase()] = category;
    });
  });

  getBusinessGroupToCategoryMap_._cache = base;
  return base;
}

function normalizeProductGroupBusiness_(rawGroup, rawProduct) {
  const groupText = normalizeCell(rawGroup).toLowerCase().replace(/aзп/g, 'азп');
  const productText = normalizeCell(rawProduct).toLowerCase().replace(/aзп/g, 'азп');
  const text = (groupText + ' | ' + productText).toLowerCase();
  const businessMap = getBusinessGroupToCategoryMap_();
  const groups = Object.keys(businessMap).sort(function(a, b) { return b.length - a.length; });

  // 1. Якщо у МойСклад або в назві товару вже є бізнес-група — беремо її.
  for (var i = 0; i < groups.length; i++) {
    const key = groups[i];
    if (!key) continue;
    if (groupText === key || groupText.indexOf(key) !== -1 || productText.indexOf(key) !== -1) return key;
  }

  // 2. Розумна класифікація по назві товару, коли group у МойСклад = бренд/скорочення/сміття.
  if (/захисн.*скло|скло|glass|camera lens|lens protector|lens glass/.test(text)) {
    if (/камер|camera|lens/.test(text) && /samsung/.test(text)) return 'захисне скло для камери samsung';
    if (/камер|camera|lens/.test(text) && /iphone/.test(text)) return 'захисне скло для камери iphone';
    if (/ipad/.test(text)) return 'захисне скло для ipad';
    if (/iphone/.test(text)) return 'захисне скло для iphone';
    if (/samsung/.test(text)) return 'захисне скло для samsung';
    if (/watch|apple watch/.test(text)) return 'захисне скло для apple watch';
    return 'захисне скло для iphone';
  }

  if (/плівк|пленк|film|protective film|screen protector/.test(text)) {
    if (/macbook/.test(text)) return 'захисні плівки для macbook';
    if (/ipad/.test(text)) return 'захисні плівки для ipad';
    return 'захисні плівки для ipad';
  }

  if (/конверт|sleeve|leather\s*sleeve|skin\s*(zero|armor|pro|croco)|horizontal\s*sleeve|minimalist\s*sleeve/.test(text)) {
    return 'чохли для macbook';
  }

  if (/чохол|чехол|case|cover|bumper/.test(text)) {
    if (/ipad/.test(text)) return 'чохли для ipad';
    if (/iphone/.test(text)) return 'чохли для iphone';
    if (/samsung/.test(text)) return 'чохли для samsung';
    if (/macbook/.test(text)) return 'чохли для macbook';
    if (/airpods/.test(text)) return 'чохли для airpods';
    if (/airtag/.test(text)) return 'чохли для airtag';
    return 'чохли для iphone';
  }

  if (/ремінец|ремінець|ремешок|band|strap/.test(text)) return 'ремінці для apple watch';
  if (/шнурок|lanyard/.test(text)) return 'шнурки для iphone';
  if (/рюкзак|backpack|organizer|органайзер|сумк|bag|pouch/.test(text)) return 'сумки для аксесуарів';

  if (/прикурювач|(^|[\s\/\-\|])азп($|[\s\/\-\|])|car\s*charger|auto\s*charger|авто.*заряд|заряд.*авто/.test(text)) return 'прикурювачі';
  if (/автотримач|авто.*тримач|car\s*holder|holder/.test(text)) return 'автотримачі';

  if (/power\s*bank|powerbank|повербанк|павербанк/.test(text)) return 'powerbank';
  if (/wireless|бездротов|magsafe|mag\s*safe/.test(text) && /(заряд|charge|charging|charger|станц)/.test(text)) return 'бездротові зарядки';
  if (/(laptop|ноутбук|macbook).*(заряд|charge|adapter|адаптер)/.test(text) || /(заряд|charge|adapter|адаптер).*(laptop|ноутбук|macbook)/.test(text)) return 'зарядки для ноутбуків';
  if (/watch|apple watch/.test(text) && /(заряд|charge|charging|charger)/.test(text)) return 'зарядні для apple watch';
  if (/cable|кабель|шнур/.test(text) && /перехід|переходник|adapter|usb-c аксесуар|type-c аксесуар/.test(text)) return 'кабелі - перехідники';
  if (/cable|кабель|шнур/.test(text)) return 'кабелі';
  if (/adapter|адаптер|charger|зарядний|зарядка|charging block|wall charger|gan/.test(text)) return 'адаптери';

  if (/навушник|наушник|earbud|earphone|headphone|headset/.test(text)) return 'навушники';
  if (/pencil|stylus|стилус/.test(text)) return 'pencil';
  if (/usb-c аксесуар|type-c аксесуар|hub|dock|card reader|кардрідер|кардридер|flash drive|накопичувач/.test(text)) return 'перехідники/usb-c аксесуари';
  if (/розетк|socket|plug/.test(text)) return 'перехідники для розетки';

  return '';
}

function toTitleCaseUkrGroup_(normalizedGroup) {
  if (!normalizedGroup) return '';

  const key = normalizeCell(normalizedGroup).toLowerCase();
  const catMap = getBusinessCategoryMap_();

  for (var category in catMap) {
    for (var i = 0; i < catMap[category].length; i++) {
      if (normalizeCell(catMap[category][i]).toLowerCase() === key) {
        return catMap[category][i];
      }
    }
  }

  return normalizedGroup;
}

function extractSalesProductGroupRaw_(assortment) {
  return (
    normalizeCell(safeGet(assortment, ['pathName'], '')) ||
    normalizeCell(safeGet(assortment, ['productFolder', 'name'], '')) ||
    normalizeCell(safeGet(assortment, ['folder', 'pathName'], '')) ||
    normalizeCell(safeGet(assortment, ['folder', 'name'], '')) ||
    normalizeCell(safeGet(assortment, ['group', 'name'], '')) ||
    ''
  );
}

function resolveSalesProductGroupFromAssortment_(assortment) {
  const productName = extractProductName_(assortment) || 'Без назви';
  const rawGroup = extractSalesProductGroupRaw_(assortment);
  const normalized = normalizeProductGroupBusiness_(rawGroup, productName);

  if (normalized) {
    return toTitleCaseUkrGroup_(normalized);
  }

  return normalizeCell(rawGroup);
}

const SALES_BRAND_ATTR_CACHE_ = {};

function fetchEntityWithAttributesForSales_(metaHref) {
  const href = normalizeCell(metaHref);
  if (!href) return null;

  let url = href;
  const expand = 'attributes,product,productFolder,brand,manufacturer';
  url += (url.indexOf('?') === -1 ? '?' : '&') + 'expand=' + encodeURIComponent(expand);

  return apiGet(url);
}

function extractSalesBrand_(assortment) {
  const cacheKey =
    normalizeCell(safeGet(assortment, ['id'], '')) ||
    normalizeCell(safeGet(assortment, ['meta', 'href'], ''));

  if (cacheKey && Object.prototype.hasOwnProperty.call(SALES_BRAND_ATTR_CACHE_, cacheKey)) {
    return SALES_BRAND_ATTR_CACHE_[cacheKey];
  }

  let brand =
    normalizeCell(safeGet(assortment, ['brand', 'name'], '')) ||
    normalizeCell(safeGet(assortment, ['manufacturer', 'name'], '')) ||
    extractBrandFromAttributes_(assortment);

  let full = null;

  // Якщо бренд не прийшов у positions.assortment — відкриваємо повну картку товару,
  // як у основному sales dashboard.
  if (!brand) {
    const href = safeGet(assortment, ['meta', 'href'], '');
    if (href) {
      try {
        full = fetchEntityWithAttributesForSales_(href);
        brand =
          normalizeCell(safeGet(full, ['brand', 'name'], '')) ||
          normalizeCell(safeGet(full, ['manufacturer', 'name'], '')) ||
          extractBrandFromAttributes_(full);
      } catch (e) {
        Logger.log('extractSalesBrand full entity error: ' + e);
      }
    }
  }

  // Для модифікацій/варіантів бренд може бути тільки у батьківському product.
  if (!brand && full) {
    const productHref =
      safeGet(full, ['product', 'meta', 'href'], '') ||
      safeGet(full, ['meta', 'productHref'], '');

    if (productHref) {
      try {
        const productEntity = fetchEntityWithAttributesForSales_(productHref);
        brand =
          normalizeCell(safeGet(productEntity, ['brand', 'name'], '')) ||
          normalizeCell(safeGet(productEntity, ['manufacturer', 'name'], '')) ||
          extractBrandFromAttributes_(productEntity);
      } catch (e2) {
        Logger.log('extractSalesBrand parent product error: ' + e2);
      }
    }
  }

  // Фолбек як у старій логіці: якщо бренду нема — хоча б не лишаємо пусто.
  brand = normalizeCell(brand) || normalizeCell(safeGet(assortment, ['productFolder', 'name'], ''));

  if (cacheKey) SALES_BRAND_ATTR_CACHE_[cacheKey] = brand;
  return brand;
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

function isDemandEligibleForSales_(demand) {
  if (!demand) return false;

  if (typeof demand.applicable === 'boolean' && !demand.applicable) {
    return false;
  }

  const status = extractDemandStatus_(demand).toLowerCase();
  if (!status) return true;

  return !isExcludedSalesStatusText_(status);
}

function extractDiscountPct_(pos) {
  const raw =
    safeGet(pos, ['discount'], '') ||
    safeGet(pos, ['discountPercent'], '') ||
    safeGet(pos, ['discountpercent'], '') ||
    safeGet(pos, ['discountPct'], '') ||
    safeGet(pos, ['discountpct'], '') ||
    safeGet(pos, ['discountProportion'], '') ||
    safeGet(pos, ['discountproportion'], '');

  let value = Number(raw || 0);
  if (value > 0 && value <= 1) value = value * 100;
  return round2(value);
}

function extractRevenue_(pos, quantity, unitPrice, discountPct) {
  const sumValue = safeGet(pos, ['sum'], null);
  if (sumValue !== null && sumValue !== '' && sumValue !== undefined) {
    return round2(money(sumValue));
  }

  const gross = Number(quantity || 0) * Number(unitPrice || 0);
  const net = gross * (1 - Number(discountPct || 0) / 100);
  return round2(net);
}

function fetchSalesDocsForPeriod_(startText, endTextExclusive) {
  const params = {
    expand: 'agent,positions.assortment,owner,state',
    order: 'moment,desc'
  };

  const filters = ['applicable=true'];
  if (startText) filters.push('moment>=' + startText);
  if (endTextExclusive) filters.push('moment<' + endTextExclusive);
  params.filter = filters.join(';');

  return fetchPagedRows_('/entity/demand', params, MOYSKLAD_ENTITY_LIMIT);
}

function buildSalesHistoryRows_(docs) {
  const out = [];

  (Array.isArray(docs) ? docs : []).forEach(function(demand) {
    if (!isDemandEligibleForSales_(demand)) return;

    const positions = getDocumentPositions_(demand, '/entity/demand');
    const client = normalizeCell(safeGet(demand, ['agent', 'name'], '')) || 'Без клієнта';
    const status = extractDemandStatus_(demand);
    const moment = normalizeCell(demand.moment);

    positions.forEach(function(pos) {
      const entity = safeGet(pos, ['assortment'], {}) || {};
      const quantity = Number(pos.quantity || 0);
      const unitPrice = round2(money(pos.price));
      const discountPct = extractDiscountPct_(pos);
      const revenue = extractRevenue_(pos, quantity, unitPrice, discountPct);
      const sku = extractSalesSku_(entity);
      const productName = extractProductName_(entity) || 'Без назви';
      const productGroup = resolveSalesProductGroupFromAssortment_(entity);
      const brand = extractSalesBrand_(entity);

      out.push([
        momentToMonth(moment),
        moment,
        normalizeCell(demand.id),
        normalizeCell(demand.name),
        client,
        extractPositionId_(pos),
        sku,
        productName,
        productGroup,
        brand,
        round2(quantity),
        unitPrice,
        discountPct,
        revenue,
        status,
        extractProductId_(entity)
      ]);
    });
  });

  return out;
}

function buildSalesHistoryRowKey_(row) {
  const idx = getHeaderIndexMap_(SALES_HISTORY_HEADERS);
  const orderId = normalizeCell(row[idx.order_id] || '');
  const positionId = normalizeCell(row[idx.position_id] || '');
  const sku = normalizeCell(row[idx.code] || '');
  const product = normalizeCell(row[idx.product] || '');

  return [orderId, positionId || sku || product].join('||');
}

function getUniqueSalesHistoryRows_(rows) {
  const seen = {};
  const out = [];
  let duplicateCount = 0;

  (Array.isArray(rows) ? rows : []).forEach(function(row) {
    const key = buildSalesHistoryRowKey_(row);
    if (!key || key === '||') return;

    if (!seen[key]) {
      seen[key] = true;
      out.push(row);
    } else {
      duplicateCount++;
    }
  });

  Logger.log(
    'getUniqueSalesHistoryRows_ -> input=' + (rows ? rows.length : 0) +
    ', output=' + out.length +
    ', duplicates_removed=' + duplicateCount
  );

  return {
    rows: out,
    duplicates_removed: duplicateCount
  };
}

function buildSalesRowsStats_(rows) {
  const idx = getHeaderIndexMap_(SALES_HISTORY_HEADERS);
  const stats = {
    rows: 0,
    quantity: 0,
    revenue: 0,
    orders: 0,
    clients: 0
  };
  const ordersSeen = {};
  const clientsSeen = {};

  (Array.isArray(rows) ? rows : []).forEach(function(row) {
    stats.rows += 1;
    stats.quantity = round2(stats.quantity + Number(row[idx.quantity] || 0));
    stats.revenue = round2(stats.revenue + Number(row[idx.revenue] || 0));

    const orderId = normalizeCell(row[idx.order_id] || row[idx.order_name]);
    if (orderId && !ordersSeen[orderId]) {
      ordersSeen[orderId] = true;
      stats.orders += 1;
    }

    const client = normalizeCell(row[idx.client]);
    if (client && !clientsSeen[client]) {
      clientsSeen[client] = true;
      stats.clients += 1;
    }
  });

  return stats;
}

function ensureSalesHistorySheet_() {
  const sheet = getOrCreateSheet(SHEET_SALES_HISTORY);
  ensureHeadersForSheet(sheet, SALES_HISTORY_HEADERS);
  applyTextFormatsForHeaders_(sheet, SALES_HISTORY_HEADERS);
  return sheet;
}

function fetchSalesChunkForHistory_(filter, offset) {
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

function buildSalesRowsForHistory_(rows) {
  const out = [];

  (Array.isArray(rows) ? rows : []).forEach(function(demand) {
    const agent = demand.agent || {};
    const client = normalizeCell(safeGet(agent, ['name'], 'Без клієнта')) || 'Без клієнта';
    const positions = safeGet(demand, ['positions', 'rows'], []);

    (Array.isArray(positions) ? positions : []).forEach(function(pos) {
      const assortment = pos.assortment || {};
      const quantity = Number(pos.quantity || 0);
      const unitPrice = round2(money(pos.price));
      const discountPct = extractDiscountPct_(pos);
      const revenue = extractRevenue_(pos, quantity, unitPrice, discountPct);
      const normalizedGroup = resolveSalesProductGroupFromAssortment_(assortment);

      out.push([
        momentToMonth(demand.moment || ''),
        demand.moment || '',
        demand.id || '',
        demand.name || '',
        client,
        extractPositionId_(pos),
        extractSalesSku_(assortment),
        extractProductName_(assortment) || 'Без назви',
        normalizedGroup,
        extractSalesBrand_(assortment),
        quantity,
        unitPrice,
        discountPct,
        revenue,
        extractDemandStatus_(demand),
        extractProductId_(assortment)
      ]);
    });
  });

  return out;
}

function getUniqueSalesRowsForHistory_(rows) {
  const seen = {};
  const out = [];
  let duplicateCount = 0;

  (Array.isArray(rows) ? rows : []).forEach(function(row) {
    const key = buildSalesHistoryRowKey_(row);
    if (!key || key === '||') return;

    if (!seen[key]) {
      seen[key] = true;
      out.push(row);
    } else {
      duplicateCount++;
    }
  });

  Logger.log(
    'getUniqueSalesRowsForHistory_ -> input=' + (rows ? rows.length : 0) +
    ', output=' + out.length +
    ', duplicates_removed=' + duplicateCount
  );

  return {
    rows: out,
    duplicates_removed: duplicateCount
  };
}

function fetchSalesPeriodRowsForHistory_(startText, endTextExclusive) {
  const filter = 'moment>=' + startText + ';moment<' + endTextExclusive;

  let offset = 0;
  let allRows = [];
  let docsRead = 0;

  while (true) {
    const rows = fetchSalesChunkForHistory_(filter, offset);
    if (!rows.length) break;

    docsRead += rows.length;
    allRows = allRows.concat(buildSalesRowsForHistory_(rows));

    if (rows.length < DEMAND_LIMIT) break;
    offset += DEMAND_LIMIT;
    Utilities.sleep(DEMAND_FETCH_SLEEP_MS);
  }

  return {
    rows: allRows,
    documents: docsRead
  };
}

function getMonthRowNumbersByDateColumnForHistory_(sheet, monthPrefix, dateColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const dateValues = sheet.getRange(2, dateColumn, lastRow - 1, 1).getValues();
  const rowNumbers = [];

  for (var i = 0; i < dateValues.length; i++) {
    const dateText = normalizeMomentTextForCompare_(dateValues[i][0]);
    if (dateText.indexOf(monthPrefix) === 0) {
      rowNumbers.push(i + 2);
    }
  }

  return rowNumbers;
}

function deleteRowsInBlocksForHistory_(sheet, rowNumbers) {
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

function rebuildCurrentMonthDedupForSalesHistory_() {
  const sheet = ensureSalesHistorySheet_();
  const range = getCurrentMonthRange_();

  const fetched = fetchSalesPeriodRowsForHistory_(range.start, range.endExclusive);
  const uniqueResult = getUniqueSalesRowsForHistory_(fetched.rows);
  const uniqueFreshRows = uniqueResult.rows;

  const dateColumn = SALES_HISTORY_HEADERS.indexOf('date') + 1;
  const monthRowNumbers = getMonthRowNumbersByDateColumnForHistory_(sheet, range.month_key, dateColumn);
  deleteRowsInBlocksForHistory_(sheet, monthRowNumbers);

  if (uniqueFreshRows.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, uniqueFreshRows.length, SALES_HISTORY_HEADERS.length).setValues(uniqueFreshRows);
  }

  Logger.log(
    'rebuildCurrentMonthDedupForSalesHistory_ -> deleted old month rows: ' +
    monthRowNumbers.length +
    ', inserted unique rows: ' +
    uniqueFreshRows.length
  );

  return {
    range: range,
    documents: fetched.documents,
    raw_rows: fetched.rows.length,
    rows: uniqueFreshRows,
    duplicates_removed: uniqueResult.duplicates_removed,
    deleted_rows: monthRowNumbers.length,
    inserted_rows: uniqueFreshRows.length,
    total_rows: Math.max(0, sheet.getLastRow() - 1)
  };
}

function refreshSalesCurrentMonthNow_() {
  const result = rebuildCurrentMonthDedupForSalesHistory_();
  const range = result.range;
  const rows = result.rows;
  const stats = buildSalesRowsStats_(rows);

  setSystemMetaValue('sales_history_current_month_last_refresh', nowText());
  setSystemMetaValue('sales_history_current_month_key', range.month_key);
  setSystemMetaValue('sales_history_current_month_rows', rows.length);
  setSystemMetaValue('sales_history_current_month_revenue', stats.revenue);
  setSystemMetaValue('sales_history_current_month_duplicates_removed', result.duplicates_removed);

  return {
    ok: true,
    sheet: SHEET_SALES_HISTORY,
    mode: 'd9_run_06_rebuild_current_month_dedup',
    month_key: range.month_key,
    date_from: range.start,
    date_to_exclusive: range.endExclusive,
    documents: result.documents,
    raw_rows: result.raw_rows,
    duplicates_removed: result.duplicates_removed,
    deleted_rows: result.deleted_rows,
    inserted_rows: result.inserted_rows,
    fresh_rows: rows.length,
    fresh_orders: stats.orders,
    fresh_clients: stats.clients,
    fresh_quantity: stats.quantity,
    fresh_revenue: stats.revenue,
    total_rows_in_sheet: result.total_rows,
    completed_at: nowText()
  };
}

function replaceSheetPeriodRows_(sheetName, headers, freshRows, dateHeader, startText, endTextExclusive) {
  const oldRows = getSheetObjects_(sheetName, headers);
  const keptRows = oldRows
    .filter(function(row) {
      return !isMomentInRange_(row[dateHeader], startText, endTextExclusive);
    })
    .map(function(row) {
      return headers.map(function(header) {
        return row[header] == null ? '' : row[header];
      });
    });

  const allRows = keptRows.concat(freshRows || []);
  return writeRowsToSheet_(sheetName, headers, allRows);
}

function buildPurchaseOrderRowKeyFromArray_(row) {
  const idx = getHeaderIndexMap_(PURCHASE_ORDERS_HEADERS);
  return buildPurchaseOrderRowKeyFromParts_(idx, row);
}

function buildPurchaseOrderProductFallbackKeyFromArray_(row) {
  const idx = getHeaderIndexMap_(PURCHASE_ORDERS_HEADERS);
  const orderId = normalizeCell(row[idx.order_id]).toUpperCase();
  const orderName = normalizeCell(row[idx.order_name]).toUpperCase();
  const productId = normalizeCell(row[idx.product_id]).toUpperCase();
  const code = normalizeCell(row[idx.code]).toUpperCase();
  const product = normalizeCell(row[idx.product]).toUpperCase();
  const orderPart = orderId || orderName;
  const productPart = productId || code || product;
  if (!orderPart || !productPart) return '';
  return orderPart + '||' + productPart;
}

function buildReceiptRowKeyFromArray_(row) {
  const idx = getHeaderIndexMap_(RECEIPTS_HEADERS);
  return buildReceiptRowKeyFromParts_(idx, row);
}

function mergePurchaseOrderRowsIntoSheet_(freshRows) {
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const rows = Array.isArray(freshRows) ? freshRows : [];
  if (!rows.length) {
    return {
      rows_merged: 0,
      total_rows_written: Math.max(0, getOrCreateSheet(SHEET_PURCHASE_ORDERS).getLastRow() - 1)
    };
  }

  const existing = getSheetObjects_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS)
    .map(function(row) {
      return PURCHASE_ORDERS_HEADERS.map(function(header) {
        return row[header] == null ? '' : row[header];
      });
    });
  const idx = getHeaderIndexMap_(PURCHASE_ORDERS_HEADERS);
  const replacingOrderIds = {};
  const replacingOrderNames = {};
  const replacingFallbackKeys = {};

  rows.forEach(function(row) {
    const orderId = normalizeCell(row[idx.order_id]).toUpperCase();
    const orderName = normalizeCell(row[idx.order_name]).toUpperCase();
    const positionId = idx.position_id === undefined ? '' : normalizeCell(row[idx.position_id]);
    const fallbackKey = buildPurchaseOrderProductFallbackKeyFromArray_(row);

    if (orderId) replacingOrderIds[orderId] = true;
    if (orderName) replacingOrderNames[orderName] = true;
    if (positionId && fallbackKey) replacingFallbackKeys[fallbackKey] = true;
  });

  const keptExisting = existing.filter(function(row) {
    const orderId = normalizeCell(row[idx.order_id]).toUpperCase();
    const orderName = normalizeCell(row[idx.order_name]).toUpperCase();

    // A fetched purchase order is authoritative: replace all saved positions
    // for that order so removed/changed MoySklad rows do not stay in transit.
    if (orderId && replacingOrderIds[orderId]) return false;
    if (orderName && replacingOrderNames[orderName]) return false;

    return true;
  });

  const byKey = {};
  const order = [];

  keptExisting.concat(rows).forEach(function(row, index) {
    const isExistingRow = index < keptExisting.length;
    if (isExistingRow) {
      const positionId = idx.position_id === undefined ? '' : normalizeCell(row[idx.position_id]);
      const fallbackKey = buildPurchaseOrderProductFallbackKeyFromArray_(row);
      if (!positionId && fallbackKey && replacingFallbackKeys[fallbackKey]) return;
    }

    const key = buildPurchaseOrderRowKeyFromArray_(row);
    if (!key) return;
    if (!byKey[key]) order.push(key);
    byKey[key] = row;
  });

  const mergedRows = order.map(function(key) { return byKey[key]; });
  const written = writeRowsToSheet_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS, mergedRows);

  return {
    rows_merged: rows.length,
    orders_replaced: Object.keys(replacingOrderIds).length || Object.keys(replacingOrderNames).length,
    stale_rows_removed: existing.length - keptExisting.length,
    total_rows_written: written
  };
}

function mergeReceiptRowsIntoSheet_(freshRows) {
  ensureSystemSheet(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  const rows = Array.isArray(freshRows) ? freshRows : [];
  if (!rows.length) {
    return {
      rows_merged: 0,
      total_rows_written: Math.max(0, getOrCreateSheet(SHEET_RECEIPTS).getLastRow() - 1)
    };
  }

  const existing = getSheetObjects_(SHEET_RECEIPTS, RECEIPTS_HEADERS)
    .map(function(row) {
      return RECEIPTS_HEADERS.map(function(header) {
        return row[header] == null ? '' : row[header];
      });
    });
  const byKey = {};
  const order = [];

  existing.concat(rows).forEach(function(row) {
    const key = buildReceiptRowKeyFromArray_(row);
    if (!key) return;
    if (!byKey[key]) order.push(key);
    byKey[key] = row;
  });

  const mergedRows = order.map(function(key) { return byKey[key]; });
  const written = writeRowsToSheet_(SHEET_RECEIPTS, RECEIPTS_HEADERS, mergedRows);

  return {
    rows_merged: rows.length,
    total_rows_written: written
  };
}

function repairLinkedPurchaseOrdersFromExistingReceipts_() {
  ensureSystemSheet(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);

  const receiptRows = getSheetObjects_(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  const purchaseRows = getSheetObjects_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const docs = fetchMissingLinkedPurchaseOrderDocsFromReceiptRows_(receiptRows, purchaseRows);
  const rows = buildPurchaseOrderRows_(docs);
  const merge = mergePurchaseOrderRowsIntoSheet_(rows);
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();

  setSystemMetaValue('linked_purchase_orders_repair_last_refresh', nowText());

  return {
    ok: true,
    sheet: SHEET_PURCHASE_ORDERS,
    receipt_rows_checked: receiptRows.length,
    existing_purchase_rows: purchaseRows.length,
    linked_purchase_orders_fetched: docs.length,
    linked_purchase_order_rows: rows.length,
    merge: merge,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function repairPurchaseOrderPositionsFromExistingPurchaseOrders_() {
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);

  const purchaseRows = getSheetObjects_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const seen = {};
  const docs = [];

  purchaseRows.forEach(function(row) {
    const orderId = normalizeCell(row.order_id);
    const orderName = normalizeCell(row.order_name);
    const positionId = normalizeCell(row.position_id);
    const remaining = Number(row.quantity_remaining || 0);

    if (!orderId && !orderName) return;
    if (positionId && remaining <= 0) return;

    const key = orderId || orderName;
    if (seen[key]) return;
    seen[key] = true;

    try {
      const doc = fetchPurchaseOrderDocByReference_(orderId, orderName);
      if (doc) docs.push(doc);
    } catch (e) {
      Logger.log(
        'repairPurchaseOrderPositionsFromExistingPurchaseOrders_ skipped ' +
        (orderName || orderId) + ': ' + e
      );
    }

    Utilities.sleep(120);
  });

  const rows = buildPurchaseOrderRows_(docs);
  const merge = mergePurchaseOrderRowsIntoSheet_(rows);
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();

  setSystemMetaValue('purchase_order_positions_repair_last_refresh', nowText());

  return {
    ok: true,
    sheet: SHEET_PURCHASE_ORDERS,
    purchase_rows_checked: purchaseRows.length,
    purchase_orders_fetched: docs.length,
    purchase_order_rows: rows.length,
    merge: merge,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function repairLinkedReceiptsFromExistingPurchaseOrders_() {
  ensureSystemSheet(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);

  const purchaseRows = getSheetObjects_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const receiptRows = getSheetObjects_(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  const docs = fetchLinkedReceiptDocsForOpenPurchaseRows_(purchaseRows, receiptRows);
  const rows = buildReceiptRows_(docs);
  const merge = mergeReceiptRowsIntoSheet_(rows);
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();

  setSystemMetaValue('linked_receipts_repair_last_refresh', nowText());

  return {
    ok: true,
    sheet: SHEET_RECEIPTS,
    purchase_rows_checked: purchaseRows.length,
    receipt_rows_checked: receiptRows.length,
    linked_receipts_fetched: docs.length,
    linked_receipt_rows: rows.length,
    merge: merge,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function refreshPurchaseOrdersNow_() {
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const docs = fetchPurchaseOrderDocs_();
  const rows = buildPurchaseOrderRows_(docs);
  const written = writeRowsToSheet_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS, rows);
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();
  setSystemMetaValue('purchase_orders_last_refresh', nowText());
  return {
    ok: true,
    sheet: SHEET_PURCHASE_ORDERS,
    lookback_months: PURCHASE_DOCS_LOOKBACK_MONTHS,
    date_from: getLookbackStartText_(PURCHASE_DOCS_LOOKBACK_MONTHS),
    documents: docs.length,
    rows_written: written,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function refreshPurchaseOrdersCurrentMonthNow_() {
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const range = getCurrentMonthRange_();
  const docs = fetchPurchaseOrderDocsForPeriod_(range.start, range.endExclusive);
  const rows = buildPurchaseOrderRows_(docs);
  const written = replaceSheetPeriodRows_(
    SHEET_PURCHASE_ORDERS,
    PURCHASE_ORDERS_HEADERS,
    rows,
    'order_date',
    range.start,
    range.endExclusive
  );
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();
  setSystemMetaValue('purchase_orders_current_month_last_refresh', nowText());
  return {
    ok: true,
    sheet: SHEET_PURCHASE_ORDERS,
    mode: 'current_month_archive_replace',
    month_key: range.month_key,
    date_from: range.start,
    date_to_exclusive: range.endExclusive,
    documents: docs.length,
    fresh_rows: rows.length,
    total_rows_written: written,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function refreshPurchaseOrdersLookbackMergeNow_() {
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const startText = getLookbackStartText_(PURCHASE_OPEN_ORDERS_LOOKBACK_MONTHS);
  const docs = fetchPurchaseOrderDocsForPeriod_(startText, '');
  const rows = buildPurchaseOrderRows_(docs);
  const merge = mergePurchaseOrderRowsIntoSheet_(rows);
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();
  const completedAt = nowText();

  setSystemMetaValue('purchase_orders_last_refresh', completedAt);
  setSystemMetaValue('purchase_orders_current_month_last_refresh', completedAt);
  setSystemMetaValue('purchase_orders_open_lookback_last_refresh', completedAt);

  return {
    ok: true,
    sheet: SHEET_PURCHASE_ORDERS,
    mode: 'lookback_merge_preserve_archive',
    lookback_months: PURCHASE_OPEN_ORDERS_LOOKBACK_MONTHS,
    date_from: startText,
    documents: docs.length,
    fresh_rows: rows.length,
    merge: merge,
    reconcile: reconcile,
    completed_at: completedAt
  };
}

function refreshReceiptsNow_() {
  ensureSystemSheet(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const docs = fetchReceiptDocs_();
  const rows = buildReceiptRows_(docs);
  const written = writeRowsToSheet_(SHEET_RECEIPTS, RECEIPTS_HEADERS, rows);
  const linkedPurchaseDocs = fetchLinkedPurchaseOrderDocsFromReceipts_(docs);
  const linkedPurchaseRows = buildPurchaseOrderRows_(linkedPurchaseDocs);
  const linkedPurchaseMerge = mergePurchaseOrderRowsIntoSheet_(linkedPurchaseRows);
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();
  setSystemMetaValue('receipts_last_refresh', nowText());
  return {
    ok: true,
    sheet: SHEET_RECEIPTS,
    lookback_months: PURCHASE_DOCS_LOOKBACK_MONTHS,
    date_from: getLookbackStartText_(PURCHASE_DOCS_LOOKBACK_MONTHS),
    documents: docs.length,
    linked_purchase_orders: linkedPurchaseDocs.length,
    linked_purchase_order_rows: linkedPurchaseRows.length,
    linked_purchase_merge: linkedPurchaseMerge,
    rows_written: written,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function refreshReceiptsCurrentMonthNow_() {
  ensureSystemSheet(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const range = getCurrentMonthRange_();
  const docs = fetchReceiptDocsForPeriod_(range.start, range.endExclusive);
  const rows = buildReceiptRows_(docs);
  const written = replaceSheetPeriodRows_(
    SHEET_RECEIPTS,
    RECEIPTS_HEADERS,
    rows,
    'receipt_date',
    range.start,
    range.endExclusive
  );
  const linkedPurchaseDocs = fetchLinkedPurchaseOrderDocsFromReceipts_(docs);
  const linkedPurchaseRows = buildPurchaseOrderRows_(linkedPurchaseDocs);
  const linkedPurchaseMerge = mergePurchaseOrderRowsIntoSheet_(linkedPurchaseRows);
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();
  setSystemMetaValue('receipts_current_month_last_refresh', nowText());
  return {
    ok: true,
    sheet: SHEET_RECEIPTS,
    mode: 'current_month_archive_replace',
    month_key: range.month_key,
    date_from: range.start,
    date_to_exclusive: range.endExclusive,
    documents: docs.length,
    linked_purchase_orders: linkedPurchaseDocs.length,
    linked_purchase_order_rows: linkedPurchaseRows.length,
    linked_purchase_merge: linkedPurchaseMerge,
    fresh_rows: rows.length,
    total_rows_written: written,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function getPurchasesDashboardData() {
  ensureSystemSheet(SHEET_STOCK_CURRENT, STOCK_CURRENT_HEADERS);
  ensureSystemSheet(SHEET_SALES_HISTORY, SALES_HISTORY_HEADERS);
  ensureSystemSheet(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  ensureSystemSheet(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  ensureSystemSheet(SHEET_CARRIER_RULES, CARRIER_RULES_HEADERS);
  ensureSystemSheet(SHEET_SUPPLIER_CODE_RULES, SUPPLIER_CODE_RULES_HEADERS);
  ensureSystemSheet(SHEET_PURCHASE_DELIVERY_SETTINGS, PURCHASE_DELIVERY_SETTINGS_HEADERS);
  ensureSystemSheet(SHEET_PURCHASE_ANALYSIS_SETTINGS, PURCHASE_ANALYSIS_SETTINGS_HEADERS);

  const stock = getSheetObjects_(SHEET_STOCK_CURRENT, STOCK_CURRENT_HEADERS);
  const salesHistory = getSheetObjects_(SHEET_SALES_HISTORY, SALES_HISTORY_HEADERS);
  const purchaseOrders = getSheetObjects_(SHEET_PURCHASE_ORDERS, PURCHASE_ORDERS_HEADERS);
  const receipts = getSheetObjects_(SHEET_RECEIPTS, RECEIPTS_HEADERS);
  const analysisSettings = getSheetObjects_(SHEET_PURCHASE_ANALYSIS_SETTINGS, PURCHASE_ANALYSIS_SETTINGS_HEADERS);
  const dashboardRows = buildPurchasesDashboardRows_(stock, purchaseOrders, receipts);
  const analysisRows = buildPurchaseAnalysisRows_(purchaseOrders, stock);
  const receiptRows = buildReceiptDashboardRows_(receipts, purchaseOrders, stock);
  const archiveOrderRows = buildArchivePurchaseOrderRows_(purchaseOrders, receipts, stock);
  const productAnalysisRows = buildProductAnalysisRows_(stock, purchaseOrders, salesHistory, analysisSettings);
  const now = new Date();

  const expectedRows = purchaseOrders.filter(function(row) {
    return Number(row.quantity_remaining || 0) > 0 || Number(row.quantity_ordered || 0) > Number(row.quantity_received || 0);
  });
  const inTransitRows = purchaseOrders.filter(function(row) { return normalizeCell(row.receiving_status) === 'in_transit'; });
  const partiallyReceivedRows = purchaseOrders.filter(function(row) { return normalizeCell(row.receiving_status) === 'partially_received'; });
  const receivedRows = purchaseOrders.filter(function(row) { return normalizeCell(row.receiving_status) === 'received'; });
  const overReceivedRows = purchaseOrders.filter(function(row) { return normalizeCell(row.receiving_status) === 'over_received'; });
  const purchaseOrderStatus = buildPurchaseOrderStatusRows_(purchaseOrders);

  const overdueRows = expectedRows.filter(function(row) {
    const planned = normalizeCell(row.calculated_receipt_date || row.moysklad_planned_date);
    return planned && planned.slice(0, 10) < formatDateOnly_(now);
  });

  const options = buildDashboardOptions_(stock, purchaseOrders, receipts);

  return {
    ok: true,
    generated_at: nowText(),
    meta: {
      stock_current_last_refresh: getSystemMetaValue('stock_current_last_refresh'),
      sales_history_current_month_last_refresh: getSystemMetaValue('sales_history_current_month_last_refresh'),
      purchase_orders_last_refresh: getSystemMetaValue('purchase_orders_last_refresh'),
      purchase_orders_current_month_last_refresh: getSystemMetaValue('purchase_orders_current_month_last_refresh'),
      receipts_last_refresh: getSystemMetaValue('receipts_last_refresh'),
      receipts_current_month_last_refresh: getSystemMetaValue('receipts_current_month_last_refresh'),
      purchase_receiving_last_reconcile: getSystemMetaValue('purchase_receiving_last_reconcile'),
      linked_purchase_orders_repair_last_refresh: getSystemMetaValue('linked_purchase_orders_repair_last_refresh'),
      linked_receipts_repair_last_refresh: getSystemMetaValue('linked_receipts_repair_last_refresh'),
      purchase_order_positions_repair_last_refresh: getSystemMetaValue('purchase_order_positions_repair_last_refresh'),
      purchases_full_loop_last_refresh: getSystemMetaValue('purchases_full_loop_last_refresh')
    },
    summary: {
      products_total: stock.length,
      products_with_available: stock.filter(function(row) { return Number(row.available || 0) > 0; }).length,
      expected_positions: expectedRows.length,
      expected_qty: round2(expectedRows.reduce(function(sum, row) { return sum + Number(row.quantity_remaining || 0); }, 0)),
      in_transit_positions: inTransitRows.length,
      partially_received_positions: partiallyReceivedRows.length,
      received_positions: receivedRows.length,
      over_received_positions: overReceivedRows.length,
      overdue_positions: overdueRows.length,
      expected_orders: purchaseOrderStatus.filter(function(row) { return Number(row.quantity_remaining || 0) > 0; }).length,
      in_transit_orders: purchaseOrderStatus.filter(function(row) { return normalizeCell(row.receiving_status) === 'in_transit'; }).length,
      partially_received_orders: purchaseOrderStatus.filter(function(row) { return normalizeCell(row.receiving_status) === 'partially_received'; }).length,
      received_orders: purchaseOrderStatus.filter(function(row) { return normalizeCell(row.receiving_status) === 'received'; }).length,
      receipts_rows: receipts.length,
      analysis_rows: analysisRows.length,
      receipt_dashboard_rows: receiptRows.length,
      archive_order_rows: archiveOrderRows.length,
      product_analysis_rows: productAnalysisRows.length,
      table_positions: dashboardRows.length
    },
    options: options,
    dashboard_rows: dashboardRows,
    analysis_rows: analysisRows,
    receipts_rows: receiptRows,
    archive_order_rows: archiveOrderRows,
    product_analysis_rows: productAnalysisRows,
    stock: stock,
    purchase_orders: purchaseOrders,
    purchase_order_status: purchaseOrderStatus,
    receipts: receipts
  };
}

function buildPurchaseAnalysisRows_(purchaseOrders, stock) {
  const todayIso = formatDateOnly_(new Date());
  const sourceRows = Array.isArray(purchaseOrders) ? purchaseOrders : [];
  const activeOrderNames = {};
  const stockByKey = {};

  sourceRows.forEach(function(row) {
    const orderName = normalizeCell(row.order_name);
    if (!orderName) return;
    if (Number(row.quantity_remaining || 0) > 0) activeOrderNames[orderName] = true;
  });

  (Array.isArray(stock) ? stock : []).forEach(function(row) {
    const key = buildDashboardCodeKey_(row);
    if (!key || stockByKey[key]) return;
    stockByKey[key] = row;
  });

  function getCurrentAvailable_(row) {
    const key = buildDashboardCodeKey_(row);
    const stockRow = key ? stockByKey[key] : null;
    if (!stockRow) return 0;
    return round2(Number(stockRow.stock || 0));
  }

  function getDeliveryStatus_(row, eta) {
    const ordered = Number(row.quantity_ordered || 0);
    const received = Number(row.quantity_received || 0);
    const remaining = Number(row.quantity_remaining || 0);
    if (remaining <= 0 && received >= ordered && ordered > 0) return 'Прийнято';
    if (received > 0 && remaining > 0) return 'Частково прийнято';
    if (eta && eta.slice(0, 10) < todayIso) return 'Протерміновано в дорозі';
    return 'В дорозі';
  }

  return sourceRows
    .filter(function(row) {
      return !!activeOrderNames[normalizeCell(row.order_name)];
    })
    .map(function(row) {
      const shipDate = normalizeCell(row.ship_date);
      const eta = normalizeCell(row.calculated_receipt_date || row.moysklad_planned_date);
      const deliveryStatus = getDeliveryStatus_(row, eta);

      return {
        order_name: normalizeCell(row.order_name),
        code: normalizeCell(row.code),
        product: normalizeCell(row.product),
        brand: normalizeCell(row.brand),
        group: normalizeCell(row.group),
        quantity_ordered: Number(row.quantity_ordered || 0),
        quantity_received: Number(row.quantity_received || 0),
        in_transit_qty: Number(row.quantity_remaining || 0),
        stock_qty: getCurrentAvailable_(row),
        ship_date: shipDate,
        days_in_transit: shipDate ? diffDaysIso(shipDate, todayIso) : '',
        transit_days: row.transit_days === '' || row.transit_days == null ? '' : Number(row.transit_days || 0),
        calculated_receipt_date: eta,
        days_to_arrival: eta
          ? (eta.slice(0, 10) < todayIso ? -diffDaysIso(eta, todayIso) : diffDaysIso(todayIso, eta))
          : '',
        delivery_status: deliveryStatus,
        carrier: normalizeCell(row.carrier_code || row.carrier_name),
        supplier: normalizeCell(row.supplier_name_from_code || row.supplier),
        receiving_status: normalizeCell(row.receiving_status),
        receipt_names: normalizeCell(row.receipt_names),
        first_receipt_date: normalizeCell(row.first_receipt_date),
        last_receipt_date: normalizeCell(row.last_receipt_date)
      };
    });
}

function buildArchivePurchaseOrderRows_(purchaseOrders, receipts, stock) {
  const sourceRows = Array.isArray(purchaseOrders) ? purchaseOrders : [];
  const activeOrderNames = {};
  const purchaseKeys = {};
  const receiptByOrderAndProduct = {};
  const stockByKey = {};

  sourceRows.forEach(function(row) {
    const orderName = normalizeCell(row.order_name);
    const key = buildDashboardProductIdKey_(row);
    if (orderName && Number(row.quantity_remaining || 0) > 0) activeOrderNames[orderName] = true;
    if (orderName && key) purchaseKeys[orderName + '::' + key] = true;
  });

  (Array.isArray(stock) ? stock : []).forEach(function(row) {
    const key = buildDashboardCodeKey_(row);
    if (!key || stockByKey[key]) return;
    stockByKey[key] = row;
  });

  function ensureReceiptAgg_(row) {
    const orderName = normalizeCell(row.purchase_order_name);
    const key = buildDashboardProductIdKey_(row);
    if (!orderName || !key) return null;
    const fullKey = orderName + '::' + key;
    if (!receiptByOrderAndProduct[fullKey]) {
      receiptByOrderAndProduct[fullKey] = {
        key: fullKey,
        order_name: orderName,
        receipt_names: [],
        receipt_seen: {},
        first_receipt_date: '',
        last_receipt_date: '',
        quantity_received: 0,
        seed: row
      };
    }
    return receiptByOrderAndProduct[fullKey];
  }

  (Array.isArray(receipts) ? receipts : []).forEach(function(row) {
    const agg = ensureReceiptAgg_(row);
    if (!agg) return;
    const receiptName = normalizeCell(row.receipt_name || row.receipt_id);
    const receiptDate = normalizeCell(row.receipt_date);
    agg.quantity_received = round2(agg.quantity_received + Number(row.quantity || 0));
    if (receiptName && !agg.receipt_seen[receiptName]) {
      agg.receipt_seen[receiptName] = true;
      agg.receipt_names.push(receiptName);
    }
    if (receiptDate && (!agg.first_receipt_date || receiptDate < agg.first_receipt_date)) agg.first_receipt_date = receiptDate;
    if (receiptDate && (!agg.last_receipt_date || receiptDate > agg.last_receipt_date)) agg.last_receipt_date = receiptDate;
  });

  function getCurrentAvailable_(row) {
    const key = buildDashboardCodeKey_(row);
    const stockRow = key ? stockByKey[key] : null;
    if (!stockRow) return 0;
    return round2(Number(stockRow.stock || 0));
  }

  function rowFromPurchase_(row) {
    const orderName = normalizeCell(row.order_name);
    const key = buildDashboardProductIdKey_(row);
    const receiptAgg = key ? receiptByOrderAndProduct[orderName + '::' + key] : null;
    const shipDate = normalizeCell(row.ship_date);
    const lastReceiptDate = receiptAgg
      ? normalizeCell(receiptAgg.last_receipt_date)
      : normalizeCell(row.last_receipt_date);
    const eta = normalizeCell(row.calculated_receipt_date || row.moysklad_planned_date || lastReceiptDate);
    const received = Number(row.quantity_received || (receiptAgg && receiptAgg.quantity_received) || 0);
    const ordered = Number(row.quantity_ordered || 0);
    const status = ordered > 0 && received > ordered ? 'Прийнято більше' : 'Прийнято';
    return {
      order_name: orderName,
      code: normalizeCell(row.code),
      product: normalizeCell(row.product),
      brand: normalizeCell(row.brand),
      group: normalizeCell(row.group),
      quantity_ordered: ordered,
      quantity_received: received,
      in_transit_qty: 0,
      stock_qty: getCurrentAvailable_(row),
      ship_date: shipDate,
      days_in_transit: shipDate && lastReceiptDate ? diffDaysIso(shipDate, lastReceiptDate.slice(0, 10)) : '',
      transit_days: row.transit_days === '' || row.transit_days == null ? '' : Number(row.transit_days || 0),
      calculated_receipt_date: eta,
      days_to_arrival: '',
      delivery_status: status,
      carrier: normalizeCell(row.carrier_code || row.carrier_name),
      supplier: normalizeCell(row.supplier_name_from_code || row.supplier),
      receiving_status: status === 'Прийнято більше' ? 'over_received' : 'received',
      receipt_names: receiptAgg ? receiptAgg.receipt_names.join(', ') : normalizeCell(row.receipt_names),
      first_receipt_date: receiptAgg ? normalizeCell(receiptAgg.first_receipt_date) : normalizeCell(row.first_receipt_date),
      last_receipt_date: lastReceiptDate,
      archive_source: 'purchase_orders'
    };
  }

  function rowFromOrphanReceipt_(agg) {
    const row = agg.seed || {};
    const lastReceiptDate = normalizeCell(agg.last_receipt_date);
    return {
      order_name: normalizeCell(agg.order_name),
      code: normalizeCell(row.code),
      product: normalizeCell(row.product),
      brand: normalizeCell(row.brand),
      group: normalizeCell(row.group || row.category),
      quantity_ordered: 0,
      quantity_received: Number(agg.quantity_received || 0),
      in_transit_qty: 0,
      stock_qty: getCurrentAvailable_(row),
      ship_date: '',
      days_in_transit: '',
      transit_days: '',
      calculated_receipt_date: lastReceiptDate,
      days_to_arrival: '',
      delivery_status: 'Прийнято',
      carrier: '',
      supplier: normalizeCell(row.supplier),
      receiving_status: 'received',
      receipt_names: agg.receipt_names.join(', '),
      first_receipt_date: normalizeCell(agg.first_receipt_date),
      last_receipt_date: lastReceiptDate,
      archive_source: 'receipts_without_purchase_order'
    };
  }

  const rows = sourceRows
    .filter(function(row) {
      const orderName = normalizeCell(row.order_name);
      return orderName && !activeOrderNames[orderName];
    })
    .map(rowFromPurchase_);

  Object.keys(receiptByOrderAndProduct).forEach(function(key) {
    const agg = receiptByOrderAndProduct[key];
    if (!purchaseKeys[key]) rows.push(rowFromOrphanReceipt_(agg));
  });

  return rows.sort(function(a, b) {
    return String(b.last_receipt_date || b.calculated_receipt_date || '').localeCompare(String(a.last_receipt_date || a.calculated_receipt_date || '')) ||
      String(a.order_name || '').localeCompare(String(b.order_name || ''), 'uk');
  });
}

function buildReceiptDashboardRows_(receipts, purchaseOrders, stock) {
  const purchaseByOrderAndProduct = {};
  const stockByKey = {};

  (Array.isArray(purchaseOrders) ? purchaseOrders : []).forEach(function(row) {
    const orderName = normalizeCell(row.purchase_order_name || row.order_name);
    const key = buildDashboardProductIdKey_(row);
    if (!orderName || !key) return;
    purchaseByOrderAndProduct[orderName + '::' + key] = row;
  });

  (Array.isArray(stock) ? stock : []).forEach(function(row) {
    const key = buildDashboardCodeKey_(row);
    if (!key || stockByKey[key]) return;
    stockByKey[key] = row;
  });

  function findPurchaseRow_(receiptRow) {
    const orderName = normalizeCell(receiptRow.purchase_order_name);
    const key = buildDashboardProductIdKey_(receiptRow);
    return orderName && key ? purchaseByOrderAndProduct[orderName + '::' + key] : null;
  }

  function getCurrentAvailable_(row) {
    const key = buildDashboardCodeKey_(row);
    const stockRow = key ? stockByKey[key] : null;
    if (!stockRow) return 0;
    return round2(Number(stockRow.stock || 0));
  }

  return (Array.isArray(receipts) ? receipts : [])
    .filter(function(row) {
      return normalizeCell(row.receipt_name || row.receipt_id);
    })
    .map(function(row) {
      const purchaseRow = findPurchaseRow_(row);
      const ordered = purchaseRow ? Number(purchaseRow.quantity_ordered || 0) : 0;
      const orderReceived = purchaseRow ? Number(purchaseRow.quantity_received || 0) : 0;
      const remaining = purchaseRow ? Number(purchaseRow.quantity_remaining || 0) : 0;
      const receiptQty = Number(row.quantity || 0);
      const receiptDate = normalizeCell(row.receipt_date);
      const receiptDateOnly = receiptDate ? receiptDate.slice(0, 10) : '';
      const shipDate = purchaseRow ? normalizeCell(purchaseRow.ship_date) : '';
      const deliveryStatus = purchaseRow
        ? remaining > 0 && orderReceived > 0
          ? 'Частково прийнято'
          : 'Прийнято'
        : 'Прийнято';

      return {
        receipt_id: normalizeCell(row.receipt_id),
        receipt_name: normalizeCell(row.receipt_name || row.receipt_id),
        receipt_date: receiptDate,
        order_name: normalizeCell(row.purchase_order_name),
        purchase_order_id: normalizeCell(row.purchase_order_id),
        code: normalizeCell(row.code),
        product: normalizeCell(row.product),
        brand: normalizeCell(row.brand),
        group: normalizeCell(row.group || row.category),
        category: normalizeCell(row.category),
        quantity_ordered: ordered,
        quantity_received: receiptQty,
        order_quantity_received: orderReceived,
        in_transit_qty: remaining,
        stock_qty: getCurrentAvailable_(row),
        price: Number(row.price || 0),
        sum: Number(row.sum || 0),
        receipt_sum: Number(row.sum || 0),
        ship_date: shipDate,
        days_in_transit: shipDate && receiptDateOnly ? diffDaysIso(shipDate, receiptDateOnly) : '',
        transit_days: purchaseRow && purchaseRow.transit_days !== '' && purchaseRow.transit_days != null
          ? Number(purchaseRow.transit_days || 0)
          : '',
        calculated_receipt_date: purchaseRow ? normalizeCell(purchaseRow.calculated_receipt_date || purchaseRow.moysklad_planned_date) : '',
        days_to_arrival: '',
        delivery_status: deliveryStatus,
        carrier: purchaseRow ? normalizeCell(purchaseRow.carrier_code || purchaseRow.carrier_name) : '',
        supplier: normalizeCell(row.supplier || (purchaseRow && (purchaseRow.supplier_name_from_code || purchaseRow.supplier))),
        receiving_status: deliveryStatus === 'Частково прийнято' ? 'partially_received' : 'received'
      };
    })
    .sort(function(a, b) {
      return String(b.receipt_date || '').localeCompare(String(a.receipt_date || '')) ||
        String(b.receipt_name || '').localeCompare(String(a.receipt_name || ''), 'uk');
    });
}

function buildAnalysisSettingKey_(row) {
  const code = normalizeCell(row && row.code).toUpperCase();
  if (code) return 'code::' + code;

  const product = normalizeCell(row && row.product).toUpperCase();
  if (product) return 'name::' + product;
  return '';
}

function getAnalysisSettingsMap_(settingsRows) {
  const map = {};
  (Array.isArray(settingsRows) ? settingsRows : []).forEach(function(row) {
    const key = buildAnalysisSettingKey_(row);
    if (!key) return;
    map[key] = {
      code: normalizeCell(row.code),
      product: normalizeCell(row.product),
      brand: normalizeCell(row.brand),
      product_id: normalizeCell(row.product_id),
      target_stock_days: row.target_stock_days === '' || row.target_stock_days == null ? '' : Number(row.target_stock_days || 0),
      manual_order_qty: row.manual_order_qty === '' || row.manual_order_qty == null ? '' : Number(row.manual_order_qty || 0),
      status_override: normalizeCell(row.status_override),
      comment: normalizeCell(row.comment),
      updated_at: normalizeCell(row.updated_at)
    };
  });
  return map;
}

function estimateAnalysisLeadTimeDays_(purchaseRows) {
  const values = (Array.isArray(purchaseRows) ? purchaseRows : [])
    .map(function(row) { return Number(row.transit_days || 0); })
    .filter(function(value) { return value > 0 && value < 240; })
    .sort(function(a, b) { return a - b; });

  if (!values.length) return 35;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : Math.round((values[middle - 1] + values[middle]) / 2);
}

function buildProductAnalysisRows_(stock, purchaseOrders, salesHistory, settingsRows) {
  const byProduct = {};
  const todayIso = formatDateOnly_(new Date());
  const settingsByKey = getAnalysisSettingsMap_(settingsRows);

  function ensureRow(seed) {
    const key = buildDashboardCodeKey_(seed);
    if (!key) return null;
    if (!byProduct[key]) {
      const settings = settingsByKey[buildAnalysisSettingKey_(seed)] || {};
      byProduct[key] = {
        key: key,
        product_id: normalizeCell(seed.product_id),
        code: normalizeCell(seed.code),
        product: normalizeCell(seed.product),
        brand: normalizeCell(seed.brand),
        category: normalizeCell(seed.category),
        group: normalizeCell(seed.group || seed.category),
        stock_qty: 0,
        reserve_qty: 0,
        available_qty: 0,
        expected_qty: 0,
        in_transit_qty: 0,
        sales_total_all: 0,
        shipments_total_all: 0,
        sales_daily_map: {},
        sales_shipments_seen: {},
        lead_time_values: [],
        product_status: normalizeStockManualStatus_(seed.status),
        reorder_enabled: normalizeReorderEnabled_(seed.reorder_enabled),
        target_stock_days: settings.target_stock_days === '' || settings.target_stock_days == null ? '' : Number(settings.target_stock_days || 0),
        manual_order_qty: settings.manual_order_qty === '' || settings.manual_order_qty == null ? '' : Number(settings.manual_order_qty || 0),
        status_override: normalizeCell(settings.status_override),
        settings_comment: normalizeCell(settings.comment),
        settings_updated_at: normalizeCell(settings.updated_at)
      };
    } else {
      const row = byProduct[key];
      row.product_id = row.product_id || normalizeCell(seed.product_id);
      row.code = row.code || normalizeCell(seed.code);
      row.product = row.product || normalizeCell(seed.product);
      row.brand = row.brand || normalizeCell(seed.brand);
      row.category = row.category || normalizeCell(seed.category);
      row.group = row.group || normalizeCell(seed.group || seed.category);
      row.product_status = row.product_status || normalizeStockManualStatus_(seed.status);
      row.reorder_enabled = row.reorder_enabled || normalizeReorderEnabled_(seed.reorder_enabled);
    }
    return byProduct[key];
  }

  (Array.isArray(stock) ? stock : []).forEach(function(row) {
    const target = ensureRow(row);
    if (!target) return;
    target.stock_qty = round2(target.stock_qty + Number(row.stock || 0));
    target.reserve_qty = round2(target.reserve_qty + Number(row.reserve || 0));
    target.available_qty = round2(target.available_qty + Number(row.available || row.stock || 0));
    target.expected_qty = round2(target.expected_qty + Number(row.expected || 0));
  });

  (Array.isArray(purchaseOrders) ? purchaseOrders : []).forEach(function(row) {
    const target = ensureRow(row);
    if (!target) return;
    const remaining = Math.max(0, Number(row.quantity_remaining || 0));
    target.in_transit_qty = round2(target.in_transit_qty + remaining);
    const transitDays = Number(row.transit_days || 0);
    if (transitDays > 0) target.lead_time_values.push(transitDays);
  });

  (Array.isArray(salesHistory) ? salesHistory : []).forEach(function(row) {
    const target = ensureRow(row);
    if (!target) return;
    const date = normalizeCell(row.date).slice(0, 10);
    const qty = Math.max(0, Number(row.quantity || 0));
    if (!date || qty <= 0) return;

    if (!target.sales_daily_map[date]) {
      target.sales_daily_map[date] = { date: date, qty: 0, shipments: 0 };
    }
    target.sales_daily_map[date].qty = round2(target.sales_daily_map[date].qty + qty);
    target.sales_total_all = round2(target.sales_total_all + qty);

    const shipmentKey = normalizeCell(row.order_id || row.order_name) || (date + '::' + normalizeCell(row.position_id || row.code || row.product));
    if (shipmentKey && !target.sales_shipments_seen[shipmentKey]) {
      target.sales_shipments_seen[shipmentKey] = true;
      target.sales_daily_map[date].shipments += 1;
      target.shipments_total_all += 1;
    }
  });

  return Object.keys(byProduct).map(function(key) {
    const row = byProduct[key];
    const salesDaily = Object.keys(row.sales_daily_map)
      .sort()
      .map(function(date) { return row.sales_daily_map[date]; });
    const lastSaleDate = salesDaily.length ? salesDaily[salesDaily.length - 1].date : '';
    const leadTimeDays = row.lead_time_values.length
      ? estimateAnalysisLeadTimeDays_(row.lead_time_values.map(function(value) { return { transit_days: value }; }))
      : estimateAnalysisLeadTimeDays_([]);
    const totalAvailable = round2(row.stock_qty + row.in_transit_qty);

    return {
      key: row.key,
      product_id: row.product_id,
      code: row.code,
      product: row.product,
      brand: row.brand,
      category: row.category,
      group: row.group,
      stock_qty: row.stock_qty,
      warehouse_stock_qty: row.stock_qty,
      reserve_qty: row.reserve_qty,
      in_transit_qty: row.in_transit_qty,
      available_with_transit_qty: totalAvailable,
      sales_total_all: row.sales_total_all,
      shipments_total_all: row.shipments_total_all,
      sales_daily: salesDaily,
      last_sale_date: lastSaleDate,
      days_since_last_sale: lastSaleDate ? diffDaysIso(lastSaleDate, todayIso) : '',
      lead_time_days: leadTimeDays,
      product_status: row.product_status || 'new',
      reorder_enabled: row.reorder_enabled || getDefaultReorderEnabledForStatus_(row.product_status || 'new'),
      target_stock_days: row.target_stock_days,
      manual_order_qty: row.manual_order_qty,
      status_override: row.status_override,
      settings_comment: row.settings_comment,
      settings_updated_at: row.settings_updated_at
    };
  }).sort(function(a, b) {
    return String(a.brand || '').localeCompare(String(b.brand || ''), 'uk') ||
      String(a.product || '').localeCompare(String(b.product || ''), 'uk') ||
      String(a.code || '').localeCompare(String(b.code || ''), 'uk');
  });
}

function savePurchaseAnalysisSettingForClient(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const productId = normalizeCell(source.product_id);
  const code = normalizeCell(source.code);
  const product = normalizeCell(source.product);
  const brand = normalizeCell(source.brand);
  if (!productId && !code && !product) throw new Error('Для налаштування потрібен product_id, code або product');

  const sheet = getOrCreateSheet(SHEET_PURCHASE_ANALYSIS_SETTINGS);
  ensureHeadersForSheet(sheet, PURCHASE_ANALYSIS_SETTINGS_HEADERS);
  applyTextFormatsForHeaders_(sheet, PURCHASE_ANALYSIS_SETTINGS_HEADERS);

  const targetKey = buildAnalysisSettingKey_({ product_id: productId, code: code, product: product });
  const lastRow = sheet.getLastRow();
  let rows = [];
  if (lastRow > 1) {
    rows = sheet.getRange(2, 1, lastRow - 1, PURCHASE_ANALYSIS_SETTINGS_HEADERS.length).getValues();
  }

  let targetIndex = -1;
  for (var i = 0; i < rows.length; i++) {
    const existing = {};
    PURCHASE_ANALYSIS_SETTINGS_HEADERS.forEach(function(header, index) {
      existing[header] = rows[i][index];
    });
    if (buildAnalysisSettingKey_(existing) === targetKey) {
      targetIndex = i;
      break;
    }
  }

  const normalized = PURCHASE_ANALYSIS_SETTINGS_HEADERS.map(function(header) {
    if (header === 'code') return code;
    if (header === 'product') return product;
    if (header === 'brand') return brand;
    if (header === 'product_id') return productId;
    if (header === 'target_stock_days') return source.target_stock_days === '' || source.target_stock_days == null ? '' : Number(source.target_stock_days || 0);
    if (header === 'manual_order_qty') return source.manual_order_qty === '' || source.manual_order_qty == null ? '' : Number(source.manual_order_qty || 0);
    if (header === 'status_override') return normalizeCell(source.status_override);
    if (header === 'comment') return normalizeCell(source.comment);
    if (header === 'updated_at') return nowText();
    return '';
  });

  if (targetIndex >= 0) {
    sheet.getRange(targetIndex + 2, 1, 1, PURCHASE_ANALYSIS_SETTINGS_HEADERS.length).setValues([normalized]);
  } else {
    sheet.getRange(lastRow + 1, 1, 1, PURCHASE_ANALYSIS_SETTINGS_HEADERS.length).setValues([normalized]);
  }

  return { ok: true, setting: normalized, updated_at: nowText() };
}

function normalizePurchaseAnalysisManualChange_(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const out = {
    product_id: normalizeCell(source.product_id),
    sku: normalizeCell(source.sku || source.code),
    code: normalizeCell(source.code || source.sku),
    product: normalizeCell(source.product),
    brand: normalizeCell(source.brand)
  };

  if (Object.prototype.hasOwnProperty.call(source, 'status')) {
    out.status = normalizeStockManualStatus_(source.status);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'reorder_enabled') ||
      Object.prototype.hasOwnProperty.call(source, 'purchasing')) {
    out.reorder_enabled = normalizeReorderEnabled_(source.reorder_enabled || source.purchasing);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'target_stock_days') ||
      Object.prototype.hasOwnProperty.call(source, 'cover_days')) {
    const value = Object.prototype.hasOwnProperty.call(source, 'target_stock_days')
      ? source.target_stock_days
      : source.cover_days;
    out.target_stock_days = value === '' || value == null ? '' : Number(value || 0);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'manual_order_qty') ||
      Object.prototype.hasOwnProperty.call(source, 'correction')) {
    const value = Object.prototype.hasOwnProperty.call(source, 'manual_order_qty')
      ? source.manual_order_qty
      : source.correction;
    out.manual_order_qty = value === '' || value == null ? '' : Number(value || 0);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'status_override')) {
    out.status_override = normalizeCell(source.status_override);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'comment')) {
    out.comment = normalizeCell(source.comment);
  }
  return out;
}

function savePurchaseAnalysisManualBatchForClient(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const changes = Array.isArray(source) ? source : (Array.isArray(source.changes) ? source.changes : []);
  if (!changes.length) return { ok: true, saved: 0, stock_updates: 0, analysis_updates: 0, updated_at: nowText() };

  let stockUpdates = 0;
  let analysisUpdates = 0;
  const errors = [];

  changes.forEach(function(raw, index) {
    const change = normalizePurchaseAnalysisManualChange_(raw);
    const hasStockChange = !!change.status || !!change.reorder_enabled;
    const hasAnalysisChange =
      Object.prototype.hasOwnProperty.call(change, 'target_stock_days') ||
      Object.prototype.hasOwnProperty.call(change, 'manual_order_qty') ||
      Object.prototype.hasOwnProperty.call(change, 'status_override') ||
      Object.prototype.hasOwnProperty.call(change, 'comment');

    try {
      if (hasStockChange) {
        updateStockItemManualStatus(change);
        stockUpdates++;
      }
      if (hasAnalysisChange) {
        savePurchaseAnalysisSettingForClient(change);
        analysisUpdates++;
      }
    } catch (error) {
      errors.push('#' + (index + 1) + ': ' + (error && error.message ? error.message : error));
    }
  });

  SpreadsheetApp.flush();

  if (errors.length) {
    throw new Error('Не вдалося зберегти частину ручних змін: ' + errors.join('; '));
  }

  return {
    ok: true,
    saved: changes.length,
    stock_updates: stockUpdates,
    analysis_updates: analysisUpdates,
    updated_at: nowText()
  };
}

function buildPurchasesFrontendPayload_(data) {
  const source = data || getPurchasesDashboardData();

  return {
    ok: source.ok,
    generated_at: source.generated_at,
    meta: source.meta || {},
    refresh_loop: getRefreshLoopState(),
    summary: source.summary || {},
    options: source.options || {},
    dashboard_rows: Array.isArray(source.dashboard_rows) ? source.dashboard_rows : [],
    analysis_rows: Array.isArray(source.analysis_rows) ? source.analysis_rows : [],
    receipts_rows: Array.isArray(source.receipts_rows) ? source.receipts_rows : [],
    archive_order_rows: Array.isArray(source.archive_order_rows) ? source.archive_order_rows : [],
    product_analysis_rows: Array.isArray(source.product_analysis_rows) ? source.product_analysis_rows : []
  };
}

function getPurchasesRefreshLoopSignalForClient() {
  return {
    ok: true,
    generated_at: nowText(),
    refresh_loop: getRefreshLoopState(),
    sales_history_current_month_last_refresh: getSystemMetaValue('sales_history_current_month_last_refresh'),
    purchase_orders_current_month_last_refresh: getSystemMetaValue('purchase_orders_current_month_last_refresh'),
    purchase_orders_last_refresh: getSystemMetaValue('purchase_orders_last_refresh'),
    receipts_current_month_last_refresh: getSystemMetaValue('receipts_current_month_last_refresh'),
    receipts_last_refresh: getSystemMetaValue('receipts_last_refresh'),
    stock_current_last_refresh: getSystemMetaValue('stock_current_last_refresh'),
    purchase_receiving_last_reconcile: getSystemMetaValue('purchase_receiving_last_reconcile'),
    linked_receipts_repair_last_refresh: getSystemMetaValue('linked_receipts_repair_last_refresh'),
    purchase_order_positions_repair_last_refresh: getSystemMetaValue('purchase_order_positions_repair_last_refresh'),
    cycle_counter: Number(getSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0),
    cycle_completed_at: getSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY)
  };
}

function uniqueSorted_(values) {
  const seen = {};
  const out = [];
  (Array.isArray(values) ? values : []).forEach(function(value) {
    const text = normalizeCell(value);
    if (!text || seen[text]) return;
    seen[text] = true;
    out.push(text);
  });
  return out.sort(function(a, b) { return a.localeCompare(b, 'uk'); });
}

function buildPurchasesProductKey_(row) {
  const productId = normalizeCell(row && row.product_id);
  if (productId) return 'id::' + productId;

  const code = normalizeCell(row && row.code).toUpperCase();
  const product = normalizeCell(row && row.product).toUpperCase();
  if (code) return 'code::' + code;
  if (product) return 'name::' + product;
  return '';
}

function buildDashboardCodeKey_(row) {
  const code = normalizeCell(row && row.code).toUpperCase();
  return code ? 'code::' + code : '';
}

function buildDashboardProductIdKey_(row) {
  const productId = normalizeCell(row && row.product_id);
  return productId ? 'id::' + productId : '';
}

function pickFirstFilledText_() {
  for (var i = 0; i < arguments.length; i++) {
    var value = normalizeCell(arguments[i]);
    if (value) return value;
  }
  return '';
}

function buildDashboardOptions_(stock, purchaseOrders, receipts) {
  const rows = []
    .concat(Array.isArray(stock) ? stock : [])
    .concat(Array.isArray(purchaseOrders) ? purchaseOrders : [])
    .concat(Array.isArray(receipts) ? receipts : []);

  return {
    brands: uniqueSorted_(rows.map(function(row) { return normalizeCell(row.brand); })),
    categories: uniqueSorted_(rows.map(function(row) { return normalizeCell(row.category); })),
    groups: uniqueSorted_(rows.map(function(row) { return normalizeCell(row.group); })),
    carriers: uniqueSorted_((purchaseOrders || []).map(function(row) { return normalizeCell(row.carrier_code || row.carrier_name); })),
    suppliers: uniqueSorted_([]
      .concat((purchaseOrders || []).map(function(row) { return normalizeCell(row.supplier_name_from_code || row.supplier); }))
      .concat((receipts || []).map(function(row) { return normalizeCell(row.supplier); }))),
    stock_statuses: [
      { value: '', label: 'Усі статуси' },
      { value: 'in_stock', label: 'Є на складі' },
      { value: 'low_stock', label: 'Закінчується' },
      { value: 'zero_stock', label: 'Немає залишку' },
      { value: 'expected', label: 'Є очікування' },
      { value: 'overdue', label: 'Протерміновано' }
    ],
    sort_modes: [
      { value: 'pending_desc', label: 'Найбільше очікуємо' },
      { value: 'stock_asc', label: 'Найменший залишок' },
      { value: 'eta_asc', label: 'Найближча дата приходу' },
      { value: 'transit_desc', label: 'Найбільше днів у дорозі' }
    ]
  };
}

function buildPurchasesDashboardRows_(stock, purchaseOrders, receipts) {
  const byProduct = {};
  const today = new Date();
  const todayIso = formatDateOnly_(today);

  function ensureRow(seed) {
    const key = buildDashboardCodeKey_(seed);
    if (!key) return null;
    if (!byProduct[key]) {
      byProduct[key] = {
        key: key,
        product_id: normalizeCell(seed.product_id),
        code: normalizeCell(seed.code),
        product: normalizeCell(seed.product),
        brand: normalizeCell(seed.brand),
        category: normalizeCell(seed.category),
        group: normalizeCell(seed.group),
        available: 0,
        stock: 0,
        reserve: 0,
        expected_sheet: 0,
        pending_qty: 0,
        active_orders_count: 0,
        nearest_receipt_date: '',
        transit_elapsed_days: '',
        transit_plan_days: '',
        latest_ship_date: '',
        last_receipt_date: '',
        overdue_positions: 0,
        receipt_names: [],
        receipt_names_seen: {}
      };
    }
    const item = byProduct[key];
    item.product_id = item.product_id || normalizeCell(seed.product_id);
    item.code = item.code || normalizeCell(seed.code);
    item.product = item.product || normalizeCell(seed.product);
    item.brand = item.brand || normalizeCell(seed.brand);
    item.category = item.category || normalizeCell(seed.category);
    item.group = item.group || normalizeCell(seed.group);
    return item;
  }

  (Array.isArray(stock) ? stock : []).forEach(function(row) {
    const item = ensureRow(row);
    if (!item) return;
    item.available = round2(Number(row.available || row.stock || 0));
    item.stock = round2(Number(row.stock || 0));
    item.reserve = round2(Number(row.reserve || 0));
    item.expected_sheet = round2(Number(row.expected || 0));
  });

  (Array.isArray(purchaseOrders) ? purchaseOrders : []).forEach(function(row) {
    const item = ensureRow(row);
    if (!item) return;

    const remaining = round2(Number(row.quantity_remaining || 0));
    const shipDate = normalizeCell(row.ship_date);
    const planDays = Number(row.transit_days || 0);
    const eta = normalizeCell(row.calculated_receipt_date || row.moysklad_planned_date);
    const rowLastReceipt = normalizeCell(row.last_receipt_date);

    if (rowLastReceipt && (!item.last_receipt_date || rowLastReceipt > item.last_receipt_date)) {
      item.last_receipt_date = rowLastReceipt;
    }

    normalizeCell(row.receipt_names).split(',').map(function(name) {
      return normalizeCell(name);
    }).filter(Boolean).forEach(function(name) {
      if (item.receipt_names_seen[name]) return;
      item.receipt_names_seen[name] = true;
      item.receipt_names.push(name);
    });

    if (remaining > 0) {
      item.pending_qty = round2(item.pending_qty + remaining);
      item.active_orders_count += 1;

      if (eta && (!item.nearest_receipt_date || eta < item.nearest_receipt_date)) {
        item.nearest_receipt_date = eta;
        item.transit_plan_days = planDays > 0 ? planDays : '';
        item.latest_ship_date = shipDate;
        if (shipDate) {
          item.transit_elapsed_days = diffDaysIso(shipDate, todayIso);
        }
      }

      if (!item.nearest_receipt_date && shipDate && !item.latest_ship_date) {
        item.latest_ship_date = shipDate;
        item.transit_plan_days = planDays > 0 ? planDays : '';
        item.transit_elapsed_days = diffDaysIso(shipDate, todayIso);
      }

      if (eta && eta < todayIso) {
        item.overdue_positions += 1;
      }
    }
  });

  (Array.isArray(receipts) ? receipts : []).forEach(function(row) {
    const item = ensureRow(row);
    if (!item) return;
    const receiptDate = normalizeCell(row.receipt_date);
    if (receiptDate && (!item.last_receipt_date || receiptDate > item.last_receipt_date)) {
      item.last_receipt_date = receiptDate;
    }
  });

  return Object.keys(byProduct).map(function(key) {
    const item = byProduct[key];
    delete item.receipt_names_seen;
    item.receipt_names = item.receipt_names.join(', ');
    item.group = item.group || item.category || '';
    item.stock_status = item.pending_qty > 0 && item.overdue_positions > 0
      ? 'overdue'
      : item.pending_qty > 0
        ? 'expected'
        : item.available <= 0
          ? 'zero_stock'
          : item.available > 0 && item.available <= 5
            ? 'low_stock'
            : 'in_stock';
    return item;
  }).sort(function(a, b) {
    return String(a.product || '').localeCompare(String(b.product || ''), 'uk');
  });
}

// --------------------------------------------------
// REFRESH LOOP
// Один tick виконує одну refresh-задачу, щоб не ламатися об timeout.
// Бізнес-логіка самих оновлень лишається у наявних refresh-функціях.
// --------------------------------------------------

function removeTriggersByHandler(handlerName) {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === handlerName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function getRefreshLoopTasks_() {
  return [
    { key: 'sales_history', handler: 'refreshSalesCurrentMonthNow_', runLabel: 'RUN_11_refreshSalesCurrentMonthNow' },
    { key: 'purchase_orders', handler: 'refreshPurchaseOrdersLookbackMergeNow_', runLabel: 'RUN_08_refreshPurchaseOrdersLookbackMergeNow' },
    { key: 'receipts', handler: 'refreshReceiptsCurrentMonthNow_', runLabel: 'RUN_09_refreshReceiptsCurrentMonthNow' },
    { key: 'stock_current', handler: 'refreshStockCurrentNow_', runLabel: 'RUN_04_refreshStockCurrentNow' },
    { key: 'linked_purchase_orders', handler: 'repairLinkedPurchaseOrdersFromExistingReceipts_', runLabel: 'RUN_22_repairLinkedPurchaseOrdersFromExistingReceiptsNow' },
    { key: 'purchase_order_positions', handler: 'repairPurchaseOrderPositionsFromExistingPurchaseOrders_', runLabel: 'RUN_24_repairPurchaseOrderPositionsFromExistingPurchaseOrdersNow' },
    { key: 'linked_receipts', handler: 'repairLinkedReceiptsFromExistingPurchaseOrders_', runLabel: 'RUN_23_repairLinkedReceiptsFromExistingPurchaseOrdersNow' },
    { key: 'reconcile', handler: 'reconcilePurchaseOrdersSheetWithReceipts_', runLabel: 'RUN_12_reconcilePurchaseOrdersReceiptsNow' }
  ];
}

function getRefreshLoopMetaKey_(suffix) {
  return PURCHASES_REFRESH_LOOP_META_PREFIX + suffix;
}

function getRefreshLoopIndex_() {
  const tasks = getRefreshLoopTasks_();
  if (!tasks.length) return 0;

  const raw = Number(getSystemMetaValue(getRefreshLoopMetaKey_('index')));
  if (!isFinite(raw) || raw < 0) return 0;
  return raw % tasks.length;
}

function getRefreshLoopRetryCount_() {
  const raw = Number(getSystemMetaValue(getRefreshLoopMetaKey_('retry_count')));
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
  const text = normalizeCell(value);
  if (!text) return 0;

  const parsed = new Date(text.replace(' ', 'T'));
  const time = parsed.getTime();
  return isFinite(time) ? time : 0;
}

function healStaleRefreshLoopCurrentTask_() {
  const currentTask = normalizeCell(getSystemMetaValue(getRefreshLoopMetaKey_('current_task')));
  const currentStartedAt = normalizeCell(getSystemMetaValue(getRefreshLoopMetaKey_('current_started_at')));

  if (!currentTask || !currentStartedAt) return false;

  const startedAtMs = parseRefreshLoopDateMs_(currentStartedAt);
  if (!startedAtMs) return false;
  if (Date.now() - startedAtMs < PURCHASES_REFRESH_LOOP_STALE_TASK_MS) return false;

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

  const data = payload || {};
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

  const tasks = getRefreshLoopTasks_();
  const index = getRefreshLoopIndex_();
  const nextTask = tasks[index] || null;

  return {
    ok: true,
    handler: PURCHASES_REFRESH_LOOP_HANDLER,
    tasks: tasks.map(function(task) { return task.runLabel; }),
    current_index: index,
    next_task: nextTask ? nextTask.runLabel : '',
    retry_count: getRefreshLoopRetryCount_(),
    current_task: getSystemMetaValue(getRefreshLoopMetaKey_('current_task')),
    current_started_at: getSystemMetaValue(getRefreshLoopMetaKey_('current_started_at')),
    last_task: getSystemMetaValue(getRefreshLoopMetaKey_('last_task')),
    last_status: getSystemMetaValue(getRefreshLoopMetaKey_('last_status')),
    last_success_at: getSystemMetaValue(getRefreshLoopMetaKey_('last_success_at')),
    last_error: getSystemMetaValue(getRefreshLoopMetaKey_('last_error')),
    cycle_counter: Number(getSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0),
    cycle_completed_at: getSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY)
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
  setSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY, '');
  setSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COUNTER_KEY, '0');
  return getRefreshLoopState();
}

function installRefreshLoopTrigger() {
  removeTriggersByHandler(PURCHASES_REFRESH_LOOP_HANDLER);

  ScriptApp.newTrigger(PURCHASES_REFRESH_LOOP_HANDLER)
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('installRefreshLoopTrigger -> installed minute trigger for ' + PURCHASES_REFRESH_LOOP_HANDLER);

  return {
    ok: true,
    handler: PURCHASES_REFRESH_LOOP_HANDLER,
    every_minutes: 1,
    tasks: getRefreshLoopTasks_().map(function(task) { return task.runLabel; })
  };
}

function startRefreshLoop() {
  resetRefreshLoopState();

  return {
    ok: true,
    trigger: installRefreshLoopTrigger(),
    first_tick: {
      ok: true,
      skipped: true,
      reason: 'deferred_to_minute_trigger'
    },
    state: getRefreshLoopState()
  };
}

function stopRefreshLoop() {
  removeTriggersByHandler(PURCHASES_REFRESH_LOOP_HANDLER);
  clearRefreshLoopCurrentTaskState_();
  setRefreshLoopState_(getRefreshLoopIndex_(), 0, {
    last_status: 'stopped',
    last_error: ''
  });

  return {
    ok: true,
    handler: PURCHASES_REFRESH_LOOP_HANDLER,
    stopped: true,
    state: getRefreshLoopState()
  };
}

function markRefreshLoopCycleCompleted_() {
  const previous = Number(getSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0);
  const nextCounter = isFinite(previous) ? previous + 1 : 1;
  const completedAt = nowText();

  setSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COUNTER_KEY, String(nextCounter));
  setSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COMPLETED_AT_KEY, completedAt);
  setSystemMetaValue('purchases_full_loop_last_refresh', completedAt);

  try {
    SpreadsheetApp.flush();
  } catch (e) {
    Logger.log('SpreadsheetApp.flush skipped after refresh loop cycle: ' + e);
  }

  return {
    cycle_counter: nextCounter,
    completed_at: completedAt
  };
}

function runRefreshLoopTask_(task) {
  const handler = normalizeCell(task && task.handler);

  if (handler === 'refreshSalesCurrentMonthNow_') return refreshSalesCurrentMonthNow_();
  if (handler === 'refreshPurchaseOrdersCurrentMonthNow_') return refreshPurchaseOrdersCurrentMonthNow_();
  if (handler === 'refreshPurchaseOrdersLookbackMergeNow_') return refreshPurchaseOrdersLookbackMergeNow_();
  if (handler === 'refreshReceiptsCurrentMonthNow_') return refreshReceiptsCurrentMonthNow_();
  if (handler === 'refreshStockCurrentNow_') return refreshStockCurrentNow_();
  if (handler === 'repairLinkedPurchaseOrdersFromExistingReceipts_') return repairLinkedPurchaseOrdersFromExistingReceipts_();
  if (handler === 'repairPurchaseOrderPositionsFromExistingPurchaseOrders_') return repairPurchaseOrderPositionsFromExistingPurchaseOrders_();
  if (handler === 'repairLinkedReceiptsFromExistingPurchaseOrders_') return repairLinkedReceiptsFromExistingPurchaseOrders_();
  if (handler === 'reconcilePurchaseOrdersSheetWithReceipts_') return reconcilePurchaseOrdersSheetWithReceipts_();

  throw new Error('Невідомий handler refresh loop: ' + handler);
}

function purchasesSchedulerTick_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return {
      ok: false,
      skipped: true,
      reason: 'locked'
    };
  }

  try {
    getSystemMetaSheet();

    const tasks = getRefreshLoopTasks_();
    if (!tasks.length) {
      return { ok: false, error: 'Порожній список задач refresh loop' };
    }

    const index = getRefreshLoopIndex_();
    const retryCount = getRefreshLoopRetryCount_();
    const task = tasks[index] || tasks[0];
    const startedAt = nowText();
    setRefreshLoopCurrentTaskState_(task.runLabel, startedAt);

    try {
      const result = runRefreshLoopTask_(task);
      const nextIndex = (index + 1) % tasks.length;
      const cycleInfo = nextIndex === 0 ? markRefreshLoopCycleCompleted_() : null;

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
        cycle_counter: cycleInfo ? cycleInfo.cycle_counter : Number(getSystemMetaValue(PURCHASES_REFRESH_LOOP_CYCLE_COUNTER_KEY) || 0),
        result: result || null
      };
    } catch (err) {
      const errorMessage = String(err && err.message ? err.message : err);

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

      const fallbackNextIndex = (index + 1) % tasks.length;
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

// --------------------------------------------------
// MANUAL RUNNERS
// --------------------------------------------------

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
  const result = purchasesSchedulerTick_();
  Logger.log('RUN_05_schedulerTickNow -> %s', JSON.stringify(result));
  return result;
}

function RUN_03_testMoySkladAccess() {
  const base = getApiBase();
  const assortment = apiGet(base + '/entity/assortment?' + buildQuery({ limit: 1, offset: 0 }));
  const stock = apiGet(base + '/report/stock/all?' + buildQuery({
    limit: 1,
    offset: 0,
    filter: 'stockMode=all;quantityMode=all'
  }));

  const assortmentRows = Array.isArray(assortment && assortment.rows) ? assortment.rows : [];
  const stockRows = Array.isArray(stock && stock.rows) ? stock.rows : [];
  const firstAssortment = assortmentRows[0] || {};
  const firstStock = stockRows[0] || {};

  return {
    ok: true,
    api_base: base,
    assortment_rows_received: assortmentRows.length,
    first_assortment_name: extractProductName_(firstAssortment),
    first_assortment_code: extractCode_(firstAssortment),
    stock_rows_received: stockRows.length,
    first_stock_name: extractProductName_(mergeStockEntity_(firstStock, {})),
    completed_at: nowText()
  };
}

function RUN_03A_testPurchaseOrderNameParser() {
  ensureSystemSheet(SHEET_CARRIER_RULES, CARRIER_RULES_HEADERS);
  ensureSystemSheet(SHEET_SUPPLIER_CODE_RULES, SUPPLIER_CODE_RULES_HEADERS);
  ensureSystemSheet(SHEET_PURCHASE_DELIVERY_SETTINGS, PURCHASE_DELIVERY_SETTINGS_HEADERS);
  seedCarrierRulesIfEmpty_();
  seedSupplierCodeRulesIfEmpty_();
  seedPurchaseDeliverySettingsIfEmpty_();

  return {
    ok: true,
    sample: 'NKS-140426-H',
    parsed: parsePurchaseOrderName_(
      'NKS-140426-H',
      buildCarrierRulesLookup_(),
      buildSupplierCodeRulesLookup_(),
      buildPurchaseDeliverySettingsLookup_()
    )
  };
}

function RUN_04_refreshStockCurrentNow() {
  return refreshStockCurrentNow_();
}

function RUN_05_refreshPurchaseOrdersNow() {
  return refreshPurchaseOrdersLookbackMergeNow_();
}

function RUN_05A_refreshPurchaseOrdersFullOverwriteNow() {
  return refreshPurchaseOrdersNow_();
}

function RUN_06_refreshReceiptsNow() {
  return refreshReceiptsNow_();
}

function RUN_07_refreshPurchasesCoreNow() {
  const stock = refreshStockCurrentNow_();
  const orders = refreshPurchaseOrdersLookbackMergeNow_();
  const receipts = refreshReceiptsCurrentMonthNow_();
  const linkedOrders = repairLinkedPurchaseOrdersFromExistingReceipts_();
  const purchaseOrderPositions = repairPurchaseOrderPositionsFromExistingPurchaseOrders_();
  const linkedReceipts = repairLinkedReceiptsFromExistingPurchaseOrders_();
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();
  setSystemMetaValue('purchases_core_last_refresh', nowText());

  return {
    ok: true,
    mode: 'stock_full_orders_lookback_merge_receipts_current_month',
    stock: stock,
    purchase_orders: orders,
    receipts: receipts,
    linked_purchase_orders: linkedOrders,
    purchase_order_positions: purchaseOrderPositions,
    linked_receipts: linkedReceipts,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function RUN_08_refreshPurchaseOrdersCurrentMonthNow() {
  return refreshPurchaseOrdersLookbackMergeNow_();
}

function RUN_08_refreshPurchaseOrdersLookbackMergeNow() {
  return refreshPurchaseOrdersLookbackMergeNow_();
}

function RUN_08A_refreshPurchaseOrdersCurrentMonthOnlyNow() {
  return refreshPurchaseOrdersCurrentMonthNow_();
}

function RUN_09_refreshReceiptsCurrentMonthNow() {
  return refreshReceiptsCurrentMonthNow_();
}

function RUN_10_getPurchasesDashboardData() {
  return getPurchasesDashboardData();
}

function RUN_11_refreshSalesCurrentMonthNow() {
  return refreshSalesCurrentMonthNow_();
}

function RUN_12_reconcilePurchaseOrdersReceiptsNow() {
  return reconcilePurchaseOrdersSheetWithReceipts_();
}

function RUN_13_refreshPurchasesFullNow() {
  const stock = refreshStockCurrentNow_();
  const orders = refreshPurchaseOrdersLookbackMergeNow_();
  const receipts = refreshReceiptsNow_();
  const linkedOrders = repairLinkedPurchaseOrdersFromExistingReceipts_();
  const purchaseOrderPositions = repairPurchaseOrderPositionsFromExistingPurchaseOrders_();
  const linkedReceipts = repairLinkedReceiptsFromExistingPurchaseOrders_();
  const reconcile = reconcilePurchaseOrdersSheetWithReceipts_();
  setSystemMetaValue('purchases_full_last_refresh', nowText());

  return {
    ok: true,
    mode: 'stock_full_orders_lookback_merge_' + PURCHASE_OPEN_ORDERS_LOOKBACK_MONTHS + '_months_receipts_lookback_' + PURCHASE_DOCS_LOOKBACK_MONTHS + '_months',
    stock: stock,
    purchase_orders: orders,
    receipts: receipts,
    linked_purchase_orders: linkedOrders,
    purchase_order_positions: purchaseOrderPositions,
    linked_receipts: linkedReceipts,
    reconcile: reconcile,
    completed_at: nowText()
  };
}

function RUN_14_refreshPurchasesCoreAndSalesNow() {
  const purchases = RUN_07_refreshPurchasesCoreNow();
  const sales = refreshSalesCurrentMonthNow_();
  setSystemMetaValue('purchases_core_and_sales_last_refresh', nowText());

  return {
    ok: true,
    purchases: purchases,
    sales: sales,
    completed_at: nowText()
  };
}

function RUN_15_refreshSalesCurrentMonthLikeMainDashboardNow() {
  return refreshSalesCurrentMonthNow_();
}

function RUN_16_startRefreshLoop() {
  const result = startRefreshLoop();
  Logger.log('RUN_16_startRefreshLoop -> %s', JSON.stringify(result));
  return result;
}

function RUN_17_stopRefreshLoop() {
  return stopRefreshLoop();
}

function RUN_18_getRefreshLoopState() {
  const result = getRefreshLoopState();
  Logger.log('RUN_18_getRefreshLoopState -> %s', JSON.stringify(result));
  return result;
}

function RUN_19_resetRefreshLoopState() {
  return resetRefreshLoopState();
}

function RUN_20_schedulerTickNow() {
  const result = purchasesSchedulerTick_();
  Logger.log('RUN_20_schedulerTickNow -> %s', JSON.stringify(result));
  return result;
}

function RUN_21_installRefreshLoopTrigger() {
  return installRefreshLoopTrigger();
}

function RUN_22_repairLinkedPurchaseOrdersFromExistingReceiptsNow() {
  return repairLinkedPurchaseOrdersFromExistingReceipts_();
}

function RUN_23_repairLinkedReceiptsFromExistingPurchaseOrdersNow() {
  return repairLinkedReceiptsFromExistingPurchaseOrders_();
}

function RUN_24_repairPurchaseOrderPositionsFromExistingPurchaseOrdersNow() {
  return repairPurchaseOrderPositionsFromExistingPurchaseOrders_();
}

function getPurchasesFrontendPayloadForClient() {
  return buildPurchasesFrontendPayload_();
}

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.initialDataJson = JSON.stringify({
    ok: true,
    loading: true,
    generated_at: nowText(),
    meta: {},
    summary: {},
    options: {},
    dashboard_rows: [],
    analysis_rows: []
  });

  return template
    .evaluate()
    .setTitle('Закупки Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
