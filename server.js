const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'chess2_secret_key';

// JSON file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'chess_players.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');
const FRIEND_REQUESTS_FILE = path.join(DATA_DIR, 'friend_requests.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const CHAT_ROOMS_FILE = path.join(DATA_DIR, 'chat_rooms.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize JSON files if they don't exist
const initializeJsonFile = (filePath, defaultValue = []) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
};

initializeJsonFile(USERS_FILE);
initializeJsonFile(PLAYERS_FILE);
initializeJsonFile(FRIENDS_FILE);
initializeJsonFile(FRIEND_REQUESTS_FILE);
initializeJsonFile(MESSAGES_FILE);
initializeJsonFile(CHAT_ROOMS_FILE);

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
  getNextId: (collection, idField = 'id') => {
    if (collection.length === 0) return 1;
    return Math.max(...collection.map(item => item[idField] || item.id)) + 1;
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
    const newUserId = db.getNextId(users, 'user_id');
    
    const newUser = {
      user_id: newUserId,
      username,
      password: hashedPassword,
      created_at: new Date().toISOString(),
      avatar_seed: username // Used for generating consistent avatar
    };
    
    users.push(newUser);
    db.writeData(USERS_FILE, users);
    
    return newUser;
  },
  
  // Create a new player
  createPlayer: (userId) => {
    const players = db.readData(PLAYERS_FILE);
    const newPlayerId = db.getNextId(players, 'player_id');
    
    const newPlayer = {
      player_id: newPlayerId,
      user_id: userId,
      wins: 0,
      losses: 0,
      draws: 0,
      total_games: 0,
      win_rate: 0.00,
      cr: 0.00,
      rating_history: [
        { date: new Date().toISOString(), rating: 0.00 }
      ]
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
        user_id: player.user_id,
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
      user_id: user.user_id,
      username: user.username,
      avatar_seed: user.avatar_seed || user.username,
      total_games: player.total_games,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws,
      cr: player.cr.toString(),
      rating_history: player.rating_history || []
    };
  },
  
  // Search users
  searchUsers: (query, currentUserId) => {
    const users = db.readData(USERS_FILE);
    const players = db.readData(PLAYERS_FILE);
    
    // Filter users by query (case insensitive)
    const filteredUsers = users.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) && 
      user.user_id !== parseInt(currentUserId)
    );
    
    return filteredUsers.map(user => {
      const player = players.find(p => p.user_id === user.user_id);
      
      return {
        user_id: user.user_id,
        username: user.username,
        avatar_seed: user.avatar_seed || user.username,
        cr: player ? player.cr.toString() : "0"
      };
    });
  },
  
  // Friend system functions
  getFriendsList: (userId) => {
    const friends = db.readData(FRIENDS_FILE);
    const users = db.readData(USERS_FILE);
    const players = db.readData(PLAYERS_FILE);
    
    // Get all friendship entries where the user is involved
    const userFriends = friends.filter(f => 
      f.user_id === parseInt(userId) || f.friend_id === parseInt(userId)
    );
    
    return userFriends.map(friendship => {
      // Determine which ID is the friend's ID (not the current user's ID)
      const friendId = friendship.user_id === parseInt(userId) 
        ? friendship.friend_id 
        : friendship.user_id;
      
      const friend = users.find(user => user.user_id === friendId);
      const friendPlayer = players.find(player => player.user_id === friendId);
      
      if (!friend) return null;
      
      return {
        user_id: friend.user_id,
        username: friend.username,
        avatar_seed: friend.avatar_seed || friend.username,
        online: friendship.status === 'online',
        cr: friendPlayer ? friendPlayer.cr.toString() : "0",
        friendship_date: friendship.created_at
      };
    }).filter(Boolean); // Remove any null entries
  },
  
  getFriendRequests: (userId) => {
    const requests = db.readData(FRIEND_REQUESTS_FILE);
    const users = db.readData(USERS_FILE);
    
    // Get all pending requests where the user is the recipient
    const pendingRequests = requests.filter(r => 
      r.recipient_id === parseInt(userId) && r.status === 'pending'
    );
    
    return pendingRequests.map(request => {
      const sender = users.find(user => user.user_id === request.sender_id);
      
      if (!sender) return null;
      
      return {
        request_id: request.request_id,
        sender_id: sender.user_id,
        sender_username: sender.username,
        sender_avatar: sender.avatar_seed || sender.username,
        created_at: request.created_at
      };
    }).filter(Boolean); // Remove any null entries
  },
  
  sendFriendRequest: (senderId, recipientId) => {
    const requests = db.readData(FRIEND_REQUESTS_FILE);
    const users = db.readData(USERS_FILE);
    const friends = db.readData(FRIENDS_FILE);
    
    // Check if both users exist
    const sender = users.find(user => user.user_id === parseInt(senderId));
    const recipient = users.find(user => user.user_id === parseInt(recipientId));
    
    if (!sender || !recipient) {
      return { success: false, error: 'User not found' };
    }
    
    // Check if they are already friends
    const alreadyFriends = friends.some(f => 
      (f.user_id === parseInt(senderId) && f.friend_id === parseInt(recipientId)) ||
      (f.user_id === parseInt(recipientId) && f.friend_id === parseInt(senderId))
    );
    
    if (alreadyFriends) {
      return { success: false, error: 'Already friends' };
    }
    
    // Check if there's already a pending request in either direction
    const existingRequest = requests.find(r => 
      ((r.sender_id === parseInt(senderId) && r.recipient_id === parseInt(recipientId)) ||
       (r.sender_id === parseInt(recipientId) && r.recipient_id === parseInt(senderId))) &&
      r.status === 'pending'
    );
    
    if (existingRequest) {
      // If the recipient has already sent a request to the sender, automatically accept it
      if (existingRequest.sender_id === parseInt(recipientId)) {
        return db.respondToFriendRequest(existingRequest.request_id, senderId, 'accepted');
      }
      
      return { success: false, error: 'Request already pending' };
    }
    
    // Create new friend request
    const newRequestId = db.getNextId(requests, 'request_id');
    
    const newRequest = {
      request_id: newRequestId,
      sender_id: parseInt(senderId),
      recipient_id: parseInt(recipientId),
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    requests.push(newRequest);
    db.writeData(FRIEND_REQUESTS_FILE, requests);
    
    return { 
      success: true, 
      request: {
        request_id: newRequestId,
        recipient_username: recipient.username,
        recipient_avatar: recipient.avatar_seed || recipient.username
      }
    };
  },
  
  respondToFriendRequest: (requestId, responderId, response) => {
    const requests = db.readData(FRIEND_REQUESTS_FILE);
    const friends = db.readData(FRIENDS_FILE);
    
    // Find the request
    const requestIndex = requests.findIndex(r => r.request_id === parseInt(requestId));
    
    if (requestIndex === -1) {
      return { success: false, error: 'Request not found' };
    }
    
    const request = requests[requestIndex];
    
    // Verify the responder is the recipient of the request
    if (request.recipient_id !== parseInt(responderId)) {
      return { success: false, error: 'Not authorized to respond to this request' };
    }
    
    // Update the request status
    request.status = response;
    request.responded_at = new Date().toISOString();
    
    requests[requestIndex] = request;
    db.writeData(FRIEND_REQUESTS_FILE, requests);
    
    // If accepted, create a friendship
    if (response === 'accepted') {
      const newFriendshipId = db.getNextId(friends, 'friendship_id');
      
      const newFriendship = {
        friendship_id: newFriendshipId,
        user_id: request.sender_id,
        friend_id: request.recipient_id,
        status: 'online', // Default to online
        created_at: new Date().toISOString()
      };
      
      friends.push(newFriendship);
      db.writeData(FRIENDS_FILE, friends);
      
      return { 
        success: true, 
        friendship: newFriendship
      };
    }
    
    return { success: true };
  },
  
  removeFriend: (userId, friendId) => {
    const friends = db.readData(FRIENDS_FILE);
    
    // Find the friendship
    const friendshipIndex = friends.findIndex(f => 
      (f.user_id === parseInt(userId) && f.friend_id === parseInt(friendId)) ||
      (f.user_id === parseInt(friendId) && f.friend_id === parseInt(userId))
    );
    
    if (friendshipIndex === -1) {
      return { success: false, error: 'Friendship not found' };
    }
    
    // Remove the friendship
    friends.splice(friendshipIndex, 1);
    db.writeData(FRIENDS_FILE, friends);
    
    return { success: true };
  },
  
  // Chat system functions
  createPrivateChat: (userId1, userId2) => {
    const rooms = db.readData(CHAT_ROOMS_FILE);
    const users = db.readData(USERS_FILE);
    
    // Check if both users exist
    const user1 = users.find(user => user.user_id === parseInt(userId1));
    const user2 = users.find(user => user.user_id === parseInt(userId2));
    
    if (!user1 || !user2) {
      return { success: false, error: 'User not found' };
    }
    
    // Check if they are already friends
    if (!db.areFriends(userId1, userId2)) {
      return { success: false, error: 'Users must be friends to chat' };
    }
    
    // Check if a chat already exists between these users
    const existingChat = rooms.find(room => 
      room.type === 'private' && room.members.includes(parseInt(userId1)) && room.members.includes(parseInt(userId2))
    );
    
    if (existingChat) {
      return { 
        success: true, 
        room: existingChat
      };
    }
    
    // Create new chat room
    const newRoomId = db.getNextId(rooms, 'room_id');
    
    const newRoom = {
      room_id: newRoomId,
      type: 'private',
      name: `${user1.username} and ${user2.username}`,
      members: [parseInt(userId1), parseInt(userId2)],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    rooms.push(newRoom);
    db.writeData(CHAT_ROOMS_FILE, rooms);
    
    return { 
      success: true, 
      room: newRoom
    };
  },
  
  getUserChatRooms: (userId) => {
    const rooms = db.readData(CHAT_ROOMS_FILE);
    const users = db.readData(USERS_FILE);
    const messages = db.readData(MESSAGES_FILE);
    
    // Find all rooms where the user is a member
    const userRooms = rooms.filter(room => room.members.includes(parseInt(userId)));
    
    return userRooms.map(room => {
      let roomData = {
        room_id: room.room_id,
        type: room.type,
        name: room.name,
        created_at: room.created_at,
        updated_at: room.updated_at
      };
      
      // For private chats, get the other user's info
      if (room.type === 'private') {
        const otherUserId = room.members.find(memberId => memberId !== parseInt(userId));
        const otherUser = users.find(user => user.user_id === otherUserId);
        
        if (otherUser) {
          roomData.name = otherUser.username;
          roomData.avatar_seed = otherUser.avatar_seed || otherUser.username;
          roomData.other_user_id = otherUser.user_id;
        }
      }
      
      // Get the last message
      const roomMessages = messages.filter(msg => msg.room_id === room.room_id);
      
      if (roomMessages.length > 0) {
        // Sort messages by date and get the last one
        const lastMessage = roomMessages.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )[0];
        
        const sender = users.find(user => user.user_id === lastMessage.sender_id);
        
        roomData.last_message = {
          message_id: lastMessage.message_id,
          content: lastMessage.content,
          sender_username: sender ? sender.username : 'Unknown',
          created_at: lastMessage.created_at
        };
      }
      
      return roomData;
    });
  },
  
  getChatMessages: (roomId, limit = 50) => {
    const messages = db.readData(MESSAGES_FILE);
    const users = db.readData(USERS_FILE);
    const rooms = db.readData(CHAT_ROOMS_FILE);
    
    // Check if the room exists
    const room = rooms.find(r => r.room_id === parseInt(roomId));
    
    if (!room) {
      return { success: false, error: 'Chat room not found' };
    }
    
    // Get all messages for this room
    const roomMessages = messages
      .filter(msg => msg.room_id === parseInt(roomId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Sort by date (oldest first)
    
    // Return the most recent messages based on limit
    const limitedMessages = roomMessages.slice(-limit);
    
    return { 
      success: true, 
      messages: limitedMessages.map(msg => {
        const sender = users.find(user => user.user_id === msg.sender_id);
        
        return {
          message_id: msg.message_id,
          content: msg.content,
          sender_id: msg.sender_id,
          sender_username: sender ? sender.username : 'Unknown',
          sender_avatar: sender ? (sender.avatar_seed || sender.username) : 'unknown',
          created_at: msg.created_at
        };
      })
    };
  },
  
  sendMessage: (roomId, senderId, content) => {
    const messages = db.readData(MESSAGES_FILE);
    const rooms = db.readData(CHAT_ROOMS_FILE);
    const users = db.readData(USERS_FILE);
    
    // Check if the room exists
    const room = rooms.find(r => r.room_id === parseInt(roomId));
    
    if (!room) {
      return { success: false, error: 'Chat room not found' };
    }
    
    // Check if the sender is a member of the room
    if (!room.members.includes(parseInt(senderId))) {
      return { success: false, error: 'Not a member of this chat room' };
    }
    
    // Create new message
    const newMessageId = db.getNextId(messages, 'message_id');
    
    const newMessage = {
      message_id: newMessageId,
      room_id: parseInt(roomId),
      sender_id: parseInt(senderId),
      content,
      created_at: new Date().toISOString()
    };
    
    messages.push(newMessage);
    db.writeData(MESSAGES_FILE, messages);
    
    // Update room's updated_at timestamp
    const roomIndex = rooms.findIndex(r => r.room_id === parseInt(roomId));
    rooms[roomIndex].updated_at = new Date().toISOString();
    db.writeData(CHAT_ROOMS_FILE, rooms);
    
    // Get sender info for response
    const sender = users.find(user => user.user_id === parseInt(senderId));
    
    return { 
      success: true, 
      message: {
        message_id: newMessageId,
        content,
        sender_id: parseInt(senderId),
        sender_username: sender ? sender.username : 'Unknown',
        sender_avatar: sender ? (sender.avatar_seed || sender.username) : 'unknown',
        created_at: newMessage.created_at
      }
    };
  },
  
  // Utility functions
  areFriends: (userId1, userId2) => {
    const friends = db.readData(FRIENDS_FILE);
    
    return friends.some(f => 
      (f.user_id === parseInt(userId1) && f.friend_id === parseInt(userId2)) ||
      (f.user_id === parseInt(userId2) && f.friend_id === parseInt(userId1))
    );
  }
};

// Middleware for token verification
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

console.log('JSON database initialized successfully');

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Store connected users
const connectedUsers = new Map();

wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle authentication
      if (data.type === 'auth') {
        try {
          const decoded = jwt.verify(data.token, JWT_SECRET);
          userId = decoded.id.toString();
          
          // Store the WebSocket connection for this user
          connectedUsers.set(userId, ws);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'auth_success',
            userId: userId
          }));
          
          console.log(`User ${userId} connected to WebSocket`);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'auth_error',
            error: 'Invalid token'
          }));
        }
      }
      
      // Handle chat messages
      else if (data.type === 'chat_message' && userId) {
        const result = db.sendMessage(data.roomId, userId, data.content);
        
        if (result.success) {
          // Notify all members of the room
          const room = db.readData(CHAT_ROOMS_FILE).find(r => r.room_id === parseInt(data.roomId));
          
          if (room) {
            room.members.forEach(memberId => {
              const memberWs = connectedUsers.get(memberId.toString());
              
              if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                memberWs.send(JSON.stringify({
                  type: 'new_message',
                  roomId: data.roomId,
                  message: result.message
                }));
              }
            });
          }
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            error: result.error
          }));
        }
      }
      
      // Handle friend requests and other notifications can be added here
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (userId) {
      connectedUsers.delete(userId);
      console.log(`User ${userId} disconnected from WebSocket`);
    }
  });
});

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

// User search endpoint
app.get('/api/users/search', verifyToken, (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  try {
    const users = db.searchUsers(query, req.userId);
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Friend system endpoints
app.get('/api/friends', verifyToken, (req, res) => {
  try {
    const friends = db.getFriendsList(req.userId);
    res.json(friends);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

app.get('/api/friends/requests', verifyToken, (req, res) => {
  try {
    const requests = db.getFriendRequests(req.userId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

app.post('/api/friends/request', verifyToken, (req, res) => {
  const { recipientId } = req.body;
  
  if (!recipientId) {
    return res.status(400).json({ error: 'Recipient ID is required' });
  }
  
  try {
    const result = db.sendFriendRequest(req.userId, recipientId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

app.post('/api/friends/respond', verifyToken, (req, res) => {
  const { requestId, response } = req.body;
  
  if (!requestId || !response || !['accepted', 'rejected'].includes(response)) {
    return res.status(400).json({ error: 'Request ID and valid response are required' });
  }
  
  try {
    const result = db.respondToFriendRequest(requestId, req.userId, response);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Failed to respond to friend request' });
  }
});

app.delete('/api/friends/:friendId', verifyToken, (req, res) => {
  const { friendId } = req.params;
  
  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required' });
  }
  
  try {
    const result = db.removeFriend(req.userId, friendId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Chat system endpoints
app.get('/api/chats', verifyToken, (req, res) => {
  try {
    const chats = db.getUserChatRooms(req.userId);
    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.get('/api/chats/:roomId/messages', verifyToken, (req, res) => {
  const { roomId } = req.params;
  const { limit } = req.query;
  
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }
  
  try {
    const result = db.getChatMessages(roomId, limit ? parseInt(limit) : 50);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result.messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

app.post('/api/chats/private', verifyToken, (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    const result = db.createPrivateChat(req.userId, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result.room);
  } catch (error) {
    console.error('Error creating private chat:', error);
    res.status(500).json({ error: 'Failed to create private chat' });
  }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});