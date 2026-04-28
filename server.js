const express = require('express');
const path = require('path');
const sheets = require('./services/sheets');
const moysklad = require('./services/moysklad');
const dashboard = require('./services/dashboard');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'sales-dashboard', time: new Date().toISOString() });
});

// Main compatibility endpoint for old google.script.run calls from HTML
app.post('/api/rpc/:fn', async (req, res) => {
  const fn = req.params.fn;
  const args = Array.isArray(req.body && req.body.args) ? req.body.args : [];

  try {
    const result = await dashboard.rpc(fn, args);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('RPC failed:', fn, err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

// Direct endpoints
app.get('/api/dashboard', async (req, res) => {
  try {
    res.json(await dashboard.getDashboardData(req.query || {}));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/refresh/sales', async (req, res) => {
  try {
    res.json(await dashboard.refreshSalesFromMoySklad(req.body || {}));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post('/api/refresh/products', async (req, res) => {
  try {
    res.json(await dashboard.refreshProductsFromMoySklad());
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
