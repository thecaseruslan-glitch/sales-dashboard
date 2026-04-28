const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data', 'dashboard-data.json');
const sessions = new Map();

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { users: [], archive: [], current: [], balances_current: [], admin: {}, okr: {}, meta: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function nowText() {
  return new Date().toISOString();
}

function publicUser(user) {
  const role = normalizeText(user.role || 'manager').toLowerCase();
  return {
    email: user.email,
    role,
    display_name: user.display_name || user.email,
    manager_tag: user.manager_tag || '',
    active: user.active !== false,
    is_admin: role === 'admin',
    is_manager: role === 'manager',
    authorized: true
  };
}

function requireSession(token) {
  const session = sessions.get(token);
  if (!session) throw new Error('Сесія не знайдена. Увійди ще раз.');
  return session.user;
}

function requireAdmin(token) {
  const user = requireSession(token);
  if (!user.is_admin) throw new Error('Недостатньо прав доступу.');
  return user;
}

function buildDashboardMetaPayload(data) {
  return {
    sales_last_refresh: data.meta?.sales_last_refresh || '',
    client_tag_map_last_refresh: data.meta?.client_tag_map_last_refresh || '',
    client_balances_last_refresh: data.meta?.client_balances_last_refresh || '',
    product_stock_last_refresh: data.meta?.product_stock_last_refresh || '',
    generated_at: nowText()
  };
}

function filterRowsForUser(rows, user) {
  if (!Array.isArray(rows)) return [];
  if (user.is_admin) return rows;
  const tag = normalizeText(user.manager_tag || user.display_name).toLowerCase();
  if (!tag) return rows;
  return rows.filter(row => normalizeText(row.manager_tag || row.manager || row.manager_tag_raw || '').toLowerCase() === tag);
}

function dashboardPayload(user) {
  const data = readData();
  return {
    ok: true,
    user,
    archive: filterRowsForUser(data.archive || [], user),
    current: filterRowsForUser(data.current || [], user),
    balances_current: data.balances_current || [],
    meta: buildDashboardMetaPayload(data),
    admin: null
  };
}

function adminBootstrapPayload(user) {
  const data = readData();
  return {
    ok: true,
    user,
    balances_current: data.balances_current || [],
    admin: user.is_admin ? {
      client_manager_map: data.admin?.client_manager_map || [],
      client_alias_map: data.admin?.client_alias_map || [],
      client_status_map: data.admin?.client_status_map || [],
      client_tag_map: data.admin?.client_tag_map || [],
      product_manual_map: data.admin?.product_manual_map || [],
      product_stock: data.admin?.product_stock || [],
      product_options: data.admin?.product_options || { brands: [], categories: [], groups: [] },
      technical_tags_master: data.admin?.technical_tags_master || [],
      brand_settings: data.admin?.brand_settings || { brands: [] },
      bonuses_log: data.admin?.bonuses_log || [],
      bonuses_config: data.admin?.bonuses_config || {},
      system_status: systemStatus()
    } : null
  };
}

function systemStatus() {
  const data = readData();
  return {
    refresh_loop: { running: false, note: 'Node.js starter mode' },
    refresh_loop_cycle_completed_at: '',
    refresh_loop_cycle_counter: 0,
    sales_last_refresh: data.meta?.sales_last_refresh || '',
    client_tag_map_last_refresh: data.meta?.client_tag_map_last_refresh || '',
    client_balances_last_refresh: data.meta?.client_balances_last_refresh || '',
    product_stock_last_refresh: data.meta?.product_stock_last_refresh || '',
    dashboard_snapshot_state: 'node_starter',
    dashboard_snapshot_built_at: nowText(),
    dashboard_snapshot_invalidated_at: '',
    dashboard_snapshot_last_error: ''
  };
}

const handlers = {
  serverLogin(email, password) {
    const data = readData();
    const cleanEmail = normalizeText(email).toLowerCase();
    const user = (data.users || []).find(item =>
      normalizeText(item.email).toLowerCase() === cleanEmail &&
      String(item.password || '') === String(password || '') &&
      item.active !== false
    );

    if (!user) {
      throw new Error('Невірний email або пароль.');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const safeUser = publicUser(user);
    sessions.set(token, { user: safeUser, created_at: Date.now() });

    return {
      ok: true,
      session_token: token,
      user: safeUser
    };
  },

  serverLogout(token) {
    sessions.delete(token);
    return { ok: true };
  },

  serverGetDashboardData(token) {
    const user = requireSession(token);
    return dashboardPayload(user);
  },

  serverGetDashboardDataFresh(token) {
    const user = requireSession(token);
    return dashboardPayload(user);
  },

  serverAdminBootstrap(token) {
    const user = requireAdmin(token);
    return adminBootstrapPayload(user);
  },

  serverGetBonusesBootstrap(token) {
    const user = requireSession(token);
    const data = readData();
    return {
      ok: true,
      admin: user.is_admin ? {
        bonuses_log: data.admin?.bonuses_log || [],
        bonuses_config: data.admin?.bonuses_config || {}
      } : null
    };
  },

  serverGetRefreshLoopSignal(token) {
    requireSession(token);
    const data = readData();
    return {
      ok: true,
      cycle_counter: 0,
      cycle_completed_at: '',
      sales_last_refresh: data.meta?.sales_last_refresh || '',
      client_tag_map_last_refresh: data.meta?.client_tag_map_last_refresh || '',
      client_balances_last_refresh: data.meta?.client_balances_last_refresh || '',
      product_stock_last_refresh: data.meta?.product_stock_last_refresh || ''
    };
  },

  serverGetAdminSystemLiveStatus(token) {
    requireAdmin(token);
    return {
      ok: true,
      fetched_at: nowText(),
      system_status: systemStatus()
    };
  },

  serverGetOkrAdminConfig(token, payload) {
    const user = requireSession(token);
    const data = readData();
    const monthKey = typeof payload === 'string' ? payload : (payload?.month_key || payload?.monthKey || '');
    const allPlans = data.okr?.plans || [];
    const plans = user.is_admin
      ? allPlans.filter(p => !monthKey || p.month_key === monthKey)
      : allPlans.filter(p => (!monthKey || p.month_key === monthKey) && normalizeText(p.manager_tag).toLowerCase() === normalizeText(user.manager_tag).toLowerCase());

    return {
      ok: true,
      month_key: monthKey,
      default_manager_tags: [],
      plans,
      efficiency_global_revenue_total: 0,
      efficiency_revenue_by_manager: {}
    };
  },

  serverSaveOkrAdminConfig(token, payload) {
    requireAdmin(token);
    const data = readData();
    data.okr = data.okr || {};
    data.okr.plans = Array.isArray(payload?.plans) ? payload.plans : [];
    writeData(data);
    return {
      ok: true,
      month_key: payload?.month_key || '',
      default_manager_tags: [],
      plans: data.okr.plans
    };
  },

  serverGetManagerStockBootstrap(token) {
    requireSession(token);
    const data = readData();
    return {
      ok: true,
      admin: {
        product_stock: data.admin?.product_stock || []
      }
    };
  },

  serverSaveBrandList(token, brands) {
    requireAdmin(token);
    const data = readData();
    data.admin = data.admin || {};
    data.admin.brand_settings = { brands: Array.isArray(brands) ? brands : [] };
    writeData(data);
    return { ok: true, brand_settings: data.admin.brand_settings };
  },

  serverUpsertProductManualMap(token, item) {
    requireAdmin(token);
    const data = readData();
    data.admin = data.admin || {};
    data.admin.product_manual_map = data.admin.product_manual_map || [];
    data.admin.product_manual_map.push(Object.assign({}, item, { updated_at: nowText() }));
    writeData(data);
    return { ok: true, product_manual_map: data.admin.product_manual_map };
  },

  serverUpsertClientAliasMap(token, sourceClient, targetClient, active) {
    requireAdmin(token);
    const data = readData();
    data.admin = data.admin || {};
    data.admin.client_alias_map = data.admin.client_alias_map || [];
    data.admin.client_alias_map.push({ source_client: sourceClient, target_client: targetClient, active: active !== false, updated_at: nowText() });
    writeData(data);
    return { ok: true, client_alias_map: data.admin.client_alias_map };
  },

  serverBatchUpsertClientStatusMap(token, changes) {
    requireAdmin(token);
    const data = readData();
    data.admin = data.admin || {};
    data.admin.client_status_map = Array.isArray(changes) ? changes : [];
    writeData(data);
    return { ok: true, client_status_map: data.admin.client_status_map };
  },

  serverUpsertBonusLogEvents(token, events) {
    requireSession(token);
    const data = readData();
    data.admin = data.admin || {};
    data.admin.bonuses_log = data.admin.bonuses_log || [];
    if (Array.isArray(events)) data.admin.bonuses_log.push(...events);
    writeData(data);
    return { ok: true, bonuses_log: data.admin.bonuses_log };
  }
};

app.post('/api/rpc', async (req, res) => {
  try {
    const { method, args = [] } = req.body || {};
    if (!method || !handlers[method]) {
      throw new Error('Unknown server method: ' + method);
    }

    const result = await handlers[method](...args);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'running', time: nowText() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('Sales Dashboard server running on port ' + PORT);
});
