const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

function getAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not set');
  if (!email) throw new Error('GOOGLE_CLIENT_EMAIL is not set');
  if (!key) throw new Error('GOOGLE_PRIVATE_KEY is not set');

  key = key.replace(/\\n/g, '\n');

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function client() {
  const auth = getAuth();
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

async function readSheet(sheetName) {
  const api = await client();
  const range = `${sheetName}!A:ZZ`;
  const response = await api.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range
  });

  const values = response.data.values || [];
  if (!values.length) return [];

  const headers = values[0].map(h => String(h || '').trim());
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] ?? '');
    return obj;
  });
}

async function writeSheet(sheetName, headers, rows) {
  const api = await client();
  const values = [headers].concat(rows.map(row => headers.map(h => row[h] ?? '')));

  await ensureSheet(sheetName);

  await api.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:ZZ`
  });

  if (values.length) {
    await api.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values }
    });
  }

  return { ok: true, sheet: sheetName, rows: Math.max(0, values.length - 1) };
}

async function appendSheet(sheetName, headers, rows) {
  const api = await client();
  await ensureSheet(sheetName);

  const values = rows.map(row => headers.map(h => row[h] ?? ''));
  if (!values.length) return { ok: true, sheet: sheetName, appended: 0 };

  await api.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });

  return { ok: true, sheet: sheetName, appended: values.length };
}

async function ensureSheet(sheetName) {
  const api = await client();
  const meta = await api.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = (meta.data.sheets || []).some(s => s.properties && s.properties.title === sheetName);
  if (exists) return;

  await api.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        addSheet: { properties: { title: sheetName } }
      }]
    }
  });
}

module.exports = { readSheet, writeSheet, appendSheet, ensureSheet };
