const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5500;
const JWT_SECRET = 'chess2_secret_key';

// JSON file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'chess_players.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize JSON files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(PLAYERS_FILE)) {
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify([], null, 2));
}

// Database helper functions
const db = {
  // Read data from JSON file
  readData: (filePath) => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  },
  
  // Write data to JSON file
  writeData: (filePath, data) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing to file ${filePath}:`, error);
      return false;
    }
  },
  
  // Get next ID for a collection
  getNextId: (collection) => {
    if (collection.length === 0) return 1;
    return Math.max(...collection.map(item => item.user_id || item.player_id)) + 1;
  },
  
  // Find user by username
  findUserByUsername: (username) => {
    const users = db.readData(USERS_FILE);
    return users.find(user => user.username === username);
  },
  
  // Find user by ID
  findUserById: (userId) => {
    const users = db.readData(USERS_FILE);
    return users.find(user => user.user_id === parseInt(userId));
  },
  
  // Find player by user ID
  findPlayerByUserId: (userId) => {
    const players = db.readData(PLAYERS_FILE);
    return players.find(player => player.user_id === parseInt(userId));
  },
  
  // Create a new user
  createUser: (username, hashedPassword) => {
    const users = db.readData(USERS_FILE);
    const newUserId = db.getNextId(users);
    
    const newUser = {
      user_id: newUserId,
      username,
      password: hashedPassword,
      created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    db.writeData(USERS_FILE, users);
    
    return newUser;
  },
  
  // Create a new player
  createPlayer: (userId) => {
    const players = db.readData(PLAYERS_FILE);
    const newPlayerId = db.getNextId(players);
    
    const newPlayer = {
      player_id: newPlayerId,
      user_id: userId,
      wins: 0,
      losses: 0,
      draws: 0,
      total_games: 0,
      win_rate: 0.00,
      cr: 0.00
    };
    
    players.push(newPlayer);
    db.writeData(PLAYERS_FILE, players);
    
    return newPlayer;
  },
  
  // Get all players with their ranks
  getAllPlayersWithRank: () => {
    const players = db.readData(PLAYERS_FILE);
    const users = db.readData(USERS_FILE);
    
    // Sort players by CR in descending order
    const sortedPlayers = [...players].sort((a, b) => b.cr - a.cr);
    
    let currentRank = 1;
    let currentCR = null;
    let playersWithRank = [];
    
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      const user = users.find(u => u.user_id === player.user_id);
      
      if (!user) continue;
      
      // Use DENSE_RANK logic (same CR = same rank)
      if (i === 0 || player.cr !== currentCR) {
        currentRank = i + 1;
        currentCR = player.cr;
      }
      
      playersWithRank.push({
        player_id: player.player_id,
        username: user.username,
        rank: currentRank.toString(),
        wins: player.wins,
        losses: player.losses,
        draws: player.draws,
        total_games: player.total_games,
        win_rate: player.win_rate.toString(),
        cr: player.cr.toString()
      });
    }
    
    return playersWithRank;
  },
  
  // Get user profile data
  getUserProfile: (userId) => {
    const user = db.findUserById(userId);
    const player = db.findPlayerByUserId(userId);
    
    if (!user || !player) return null;
    
    return {
      username: user.username,
      total_games: player.total_games,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws,
      cr: player.cr.toString()
    };
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

console.log('JSON database initialized successfully');

// API Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Check if username already exists
    const existingUser = db.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = db.createUser(username, hashedPassword);
    
    // Create new player
    db.createPlayer(newUser.user_id);
    
    // Generate JWT token
    const token = jwt.sign({ id: newUser.user_id }, JWT_SECRET, { expiresIn: '1h' });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user_id: newUser.user_id,
      token
    });
    
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Find user by username
    const user = db.findUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ id: user.user_id }, JWT_SECRET, { expiresIn: '1h' });
    
    res.json({
      message: 'Login successful',
      user_id: user.user_id,
      token
    });
    
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
});

app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const userData = db.getUserProfile(userId);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(userData);
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

app.get('/api/players', (req, res) => {
  try {
    const players = db.getAllPlayersWithRank();
    res.json(players.slice(0, 50)); // Limit to 50 players
  } catch (error) {
    console.error('Error fetching players data:', error);
    res.status(500).json({ error: 'Failed to fetch players data' });
  }
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});