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

app.use(cors());
app.use(express.json());

app.get('/players', async (req, res) => {
  try {
    const result = await pool.query('SELECT username, rank, wins, losses, total_games, win_rate FROM chess_players ORDER BY rank ASC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error('Error while receiving data:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`The server is running on http://localhost:${port}`);
});
