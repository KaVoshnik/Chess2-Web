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
    const result = await pool.query(`
      SELECT cp.player_id, u.username, cp.rank, cp.wins, cp.losses, cp.total_games, cp.win_rate
      FROM chess_players cp
      JOIN users u ON cp.user_id = u.user_id
      ORDER BY cp.rank ASC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error while receiving data:', err);
    res.status(500).send('Server error');
  }
});

app.get('/matches', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.match_id, p1.username AS player1, p2.username AS player2, 
             m.winner_id, m.match_date
      FROM matches m
      JOIN chess_players p1 ON m.player1_id = p1.player_id
      JOIN chess_players p2 ON m.player2_id = p2.player_id
      ORDER BY m.match_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error while receiving match data:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`The server is running on http://localhost:${port}`);
});
