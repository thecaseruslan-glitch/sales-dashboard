const API_BASE = process.env.MOYSKLAD_API_BASE || 'https://api.moysklad.ru/api/remap/1.2';
const TOKEN = process.env.MOYSKLAD_TOKEN;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildQuery(params) {
  return Object.entries(params)
    .filter(([k, v]) => v !== undefined && v !== null && String(v).length)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
    .join('&');
}

async function apiGet(pathOrUrl, retries = 4) {
  if (!TOKEN) throw new Error('MOYSKLAD_TOKEN is not set');

  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}${pathOrUrl}`;

  let lastText = '';
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json;charset=utf-8',
        'Content-Type': 'application/json;charset=utf-8'
      }
    });

    const text = await res.text();
    lastText = text;

    if (res.ok) {
      return text ? JSON.parse(text) : {};
    }

    const isBandwidth = text.includes('Bandwidth quota exceeded');
    const isRate = res.status === 429 || res.status === 503 || isBandwidth;
    if (!isRate || attempt === retries - 1) {
      throw new Error(`MoySklad HTTP ${res.status}: ${text}`);
    }

    await sleep(isBandwidth ? 15000 + attempt * 7000 : 5000 + attempt * 3000);
  }

  throw new Error(lastText || 'MoySklad request failed');
}

async function fetchAll(endpoint, params = {}, limit = 100, delayMs = 150) {
  const rows = [];
  let offset = 0;

  while (true) {
    const query = buildQuery({ ...params, limit, offset });
    const data = await apiGet(`${endpoint}?${query}`);
    const chunk = Array.isArray(data.rows) ? data.rows : [];
    rows.push(...chunk);

    if (chunk.length < limit) break;
    offset += limit;
    await sleep(delayMs);
  }

  return rows;
}

function money(v) {
  return Number(v || 0) / 100;
}

function safe(obj, path, fallback = '') {
  let cur = obj;
  for (const p of path) {
    if (cur == null) return fallback;
    cur = cur[p];
  }
  return cur == null ? fallback : cur;
}

function normalize(v) {
  return String(v ?? '').trim();
}

function monthFromMoment(moment) {
  return String(moment || '').slice(0, 7);
}

function extractSku(product) {
  return normalize(product.article || product.code || product.externalCode || '');
}

function extractBrand(product) {
  const attrs = Array.isArray(product.attributes) ? product.attributes : [];
  const attr = attrs.find(a => String(a.name || '').trim().toLowerCase() === 'бренд' || String(a.name || '').trim().toLowerCase() === 'brand');
  if (attr) {
    if (attr.value && typeof attr.value === 'object') return normalize(attr.value.name || attr.value.value || '');
    return normalize(attr.value);
  }
  return '';
}

function normalizeGroup(groupName, productName) {
  const group = normalize(groupName);
  const lower = group.toLowerCase();
  if (!group) return classifyProductGroup(productName);

  if (
    lower.includes('перехідник') ||
    lower.includes('переходник') ||
    lower.includes('usb-c') ||
    lower.includes('usb c') ||
    lower.includes('type-c') ||
    lower.includes('type c')
  ) return 'Перехідники/USB-C аксесуари';

  return group;
}

function classifyProductGroup(name) {
  const s = String(name || '').toLowerCase();
  if (s.includes('кабель')) return 'Кабелі';
  if (s.includes('чохол') || s.includes('case')) return 'Чохли';
  if (s.includes('скло') || s.includes('glass')) return 'Захисне скло';
  if (s.includes('плівк')) return 'Захисні плівки';
  if (s.includes('адаптер')) return 'Адаптери';
  return 'Інше';
}

async function fetchProducts() {
  const products = await fetchAll('/entity/product', {
    expand: 'productFolder,attributes'
  }, 100, 150);

  return products.map(p => {
    const groupRaw = safe(p, ['productFolder', 'name'], '') || safe(p, ['folder', 'name'], '');
    return {
      assortment_id: normalize(p.id),
      meta_href: safe(p, ['meta', 'href'], ''),
      sku: extractSku(p),
      product: normalize(p.name),
      brand: extractBrand(p),
      category: normalize(groupRaw),
      product_group: normalizeGroup(groupRaw, p.name),
      updated_at: new Date().toISOString()
    };
  });
}

async function fetchSales(startDate, endDateExclusive) {
  const filter = `moment>=${startDate};moment<${endDateExclusive};applicable=true`;

  const demands = await fetchAll('/entity/demand', {
    expand: 'agent,positions.assortment,owner,state',
    filter
  }, 100, 250);

  const rows = [];

  for (const demand of demands) {
    const positions = safe(demand, ['positions', 'rows'], []);
    const client = safe(demand, ['agent', 'name'], 'Без клієнта');
    const status = safe(demand, ['state', 'name'], '');

    for (const pos of positions) {
      const a = pos.assortment || {};
      const qty = Number(pos.quantity || 0);
      const price = money(pos.price);
      const discountPct = Number(pos.discount || 0);
      const sum = pos.sum != null ? money(pos.sum) : qty * price * (1 - discountPct / 100);
      const groupRaw = safe(a, ['productFolder', 'name'], '') || safe(a, ['pathName'], '') || safe(a, ['group', 'name'], '');

      rows.push({
        month: monthFromMoment(demand.moment),
        date: demand.moment || '',
        order_id: demand.id || '',
        order_no: demand.name || '',
        client,
        position_id: pos.id || '',
        sku: extractSku(a),
        product: normalize(a.name || 'Без назви'),
        product_group: normalizeGroup(groupRaw, a.name),
        brand: extractBrand(a),
        quantity: qty,
        unit_price: price,
        discount_pct: discountPct,
        revenue: Math.round(sum * 100) / 100,
        status
      });
    }
  }

  return rows;
}

module.exports = { fetchProducts, fetchSales, buildQuery };
