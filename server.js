const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 Sales Dashboard працює</h1>
    <p>Сервер запущений успішно</p>
  `);
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
