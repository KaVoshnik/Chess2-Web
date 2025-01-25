const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Players',
  password: 'passwd',
  port: 8080,
});

app.get('/', (req, res) => {
  res.send('Welcome to the Chess Leaderboard API!');
});

app.use(cors());
app.use(express.json());

// Получение списка игроков
app.get('/players', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chess_players ORDER BY rank ASC LIMIT 50');
    
    console.log('Полученные данные игроков:', result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
