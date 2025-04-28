const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 3000;
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
  
  // Валидация входных данных
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Проверяем существование пользователя перед регистрацией
    const userExists = await pool.query(
      'SELECT 1 FROM users WHERE username = $1 LIMIT 1', 
      [username]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists',
        suggestion: 'Please choose a different username'
      });
    }

    // Начинаем транзакцию
    await pool.query('BEGIN');
    
    const userResult = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING user_id',
      [username, hashedPassword]
    );

    const newUserId = userResult.rows[0].user_id;

    await pool.query(
      'INSERT INTO chess_players (user_id) VALUES ($1)',
      [newUserId]
    );
    
    await pool.query('COMMIT');
    
    res.status(201).json({ 
      id: newUserId, 
      username,
      message: 'Registration successful' 
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Registration error:', error);
    
    if (error.code === '23505') { // Код ошибки UNIQUE violation в PostgreSQL
      return res.status(409).json({ 
        error: 'Username already exists',
        solution: 'Try a different username or login with existing account'
      });
    }
    
    res.status(500).json({ 
      error: 'Registration failed',
      details: 'Internal server error' 
    });
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
          SELECT u.username, cp.rank, cp.total_games, cp.wins, cp.losses, cp.draws, cp.cr
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

app.get('/api/cr-data', async (req, res) => {
  try {
      const result = await pool.query('SELECT date, cr FROM chess_players ORDER BY date ASC');
      res.json(result.rows);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`The server is running on http://localhost:${port}`);
});
