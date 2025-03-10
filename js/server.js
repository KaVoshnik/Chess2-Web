const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 3001;
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Chess2',
  password: 'passwd',
  port: 8080,
});

app.use(cors());
app.use(express.json());

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
      [username, hashedPassword]
    );

    const newUserId = result.rows[0].user_id;

    await pool.query(
      'INSERT INTO chess_players (user_id, wins, losses, total_games, cr) VALUES ($1, $2, $3, $4, $5)',
      [newUserId, 0, 0, 0, 0]
    );

    res.status(201).json({ id: newUserId, username: result.rows[0].username });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(400).json({ error: 'User with this name found, do you want to login?' });
  }
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length > 0) {
      const isMatch = await bcrypt.compare(password, user.rows[0].password);
      if (isMatch) {
        const token = jwt.sign({ id: user.rows[0].user_id }, 'your_jwt_secret', { expiresIn: '1h' });
        return res.json({ token, user_id: user.rows[0].user_id });
    }    
    }
    res.status(401).json({ error: 'Incorrect username or password.' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/user/:id', async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
  }

  try {
      const query = `
          SELECT u.username, cp.rank, cp.total_games, cp.wins, cp.losses, cp.cr
          FROM users u 
          JOIN chess_players cp ON u.user_id = cp.user_id 
          WHERE u.user_id = $1
      `;
      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
  } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
  }
});



app.listen(port, () => {
  console.log(`The server is running on http://localhost:${port}`);
});

/* FIX LIST:
Пофиксить ранг
Добавить постановку юзер айди при входе в аккаунт в локальное хранилище
*/