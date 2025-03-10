const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Chess2',
  password: 'passwd',
  port: 8080,
});

app.use(cors());
app.use(express.json());

app.get('/players', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
          cp.player_id, 
          u.username, 
          DENSE_RANK() OVER (ORDER BY cp.cr DESC) AS rank, 
          cp.wins, 
          cp.losses, 
          cp.total_games, 
          cp.win_rate, 
          cp.cr
      FROM 
          chess_players cp
      JOIN 
          users u ON cp.user_id = u.user_id
      ORDER BY 
          cp.cr DESC
      LIMIT 50
  `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error while receiving data:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`The server is running on http://localhost:${port}`);
});
