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
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *', [username, hashedPassword]);
    res.status(201).json({ id: result.rows[0].id, username: result.rows[0].username });
  } catch (error) {
    res.status(400).json({ error: 'User with this name found, do you want login?' });
  }
  res.json({ success: true });  
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (user.rows.length > 0) {
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (isMatch) {
      const token = jwt.sign({ id: user.rows[0].id }, 'your_jwt_secret', { expiresIn: '1h' });
      return res.json({ token });
    }
  }
  res.json({ success: true });
  res.status(401).json({ error: 'Incorrect username or password.' });
});

if (data.success) {
  localStorage.setItem('username', username);
  window.location.href = 'user_profile.html';
}


app.listen(port, () => {
  console.log(`The server is running on http://localhost:${port}`);
});
