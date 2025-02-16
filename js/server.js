const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 3001;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Players',
  password: 'passwd',
  port: 8080,
});

app.use(cors());
app.use(express.json());

app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING *',
      [username, hashedPassword, email]
    );
    res.status(201).json({ id: result.rows[0].user_id, username: result.rows[0].username });
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
        return res.json({ token });
      }
    }
    res.status(401).json({ error: 'Incorrect username or password.' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`The server is running on http://localhost:${port}`);
});
