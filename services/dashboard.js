const sheets = require('./sheets');
const moysklad = require('./moysklad');

const SALES_HEADERS = [
  'month','date','order_id','order_no','client','position_id','sku','product',
  'product_group','brand','quantity','unit_price','discount_pct','revenue','status'
];

const PRODUCT_HEADERS = [
  'assortment_id','meta_href','sku','product','brand','category','product_group','updated_at'
];

function toNumber(v) {
  if (typeof v === 'number') return v;
  return Number(String(v || '0').replace(/\s/g, '').replace(',', '.')) || 0;
}

function startOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-01 00:00:00`;
}

function startOfNextMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 2).padStart(2,'0')}-01 00:00:00`;
}

async function getDashboardData(query = {}) {
  const sales = await sheets.readSheet('sales_lines_test').catch(() => []);
  const products = await sheets.readSheet('product_stock').catch(() => []);

  const revenue = sales.reduce((sum, r) => sum + toNumber(r.revenue), 0);
  const clients = new Set(sales.map(r => r.client).filter(Boolean)).size;
  const brands = new Set(sales.map(r => r.brand).filter(Boolean)).size;
  const positions = new Set(sales.map(r => r.sku || r.product).filter(Boolean)).size;

  const byBrand = aggregate(sales, 'brand');
  const byCategory = aggregate(sales, 'product_group');
  const byGroup = aggregate(sales, 'product_group');

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    rows: sales,
    products,
    kpis: {
      revenue,
      clients,
      brands,
      positions
    },
    charts: {
      brands: byBrand,
      categories: byCategory,
      groups: byGroup
    }
  };
}

function aggregate(rows, key) {
  const map = {};
  for (const r of rows) {
    const name = r[key] || 'Без значення';
    map[name] = (map[name] || 0) + toNumber(r.revenue);
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

async function refreshProductsFromMoySklad() {
  const products = await moysklad.fetchProducts();
  await sheets.writeSheet('product_stock', PRODUCT_HEADERS, products);
  return { ok: true, sheet: 'product_stock', rows: products.length };
}

async function refreshSalesFromMoySklad(options = {}) {
  const start = options.start || startOfMonth();
  const end = options.end || startOfNextMonth();

  const rows = await moysklad.fetchSales(start, end);
  await sheets.writeSheet('sales_lines_test', SALES_HEADERS, rows);

  return { ok: true, sheet: 'sales_lines_test', start, end, rows: rows.length };
}

// Compatibility layer for old HTML google.script.run calls.
// It returns enough structure to let the dashboard load while we move logic from GAS to Node step by step.
async function rpc(fn, args = []) {
  if (fn === 'login') {
    const email = args[0] || 'admin';
    return {
      ok: true,
      user: {
        email,
        role: 'admin',
        display_name: 'Admin',
        manager_tag: ''
      },
      token: 'node-session'
    };
  }

  if (fn === 'getCurrentUser' || fn === 'getSessionUser') {
    return {
      ok: true,
      role: 'admin',
      display_name: 'Admin',
      manager_tag: '',
      email: 'admin@example.com'
    };
  }

  if (
    fn === 'getDashboardData' ||
    fn === 'getDashboardServerData' ||
    fn === 'getServerDashboardData' ||
    fn === 'loadDashboardData' ||
    fn === 'getInitialData'
  ) {
    return await getDashboardData({});
  }

  if (fn === 'refreshProductStockNow' || fn === 'RUN_10_refreshProductStockNow') {
    return await refreshProductsFromMoySklad();
  }

  if (fn === 'monthlyRepairNow' || fn === 'RUN_06_monthlyRepairNow' || fn === 'DailyRefreshNow') {
    return await refreshSalesFromMoySklad({});
  }

  if (fn.toLowerCase().includes('refresh') || fn.toLowerCase().includes('rebuild')) {
    return { ok: true, skipped: true, message: `${fn} ще не перенесено повністю в Node.js` };
  }

  return { ok: true, unsupported: true, function: fn, message: `${fn} ще не перенесено повністю в Node.js` };
}

module.exports = { getDashboardData, refreshProductsFromMoySklad, refreshSalesFromMoySklad, rpc };
