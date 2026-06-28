const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ─── In-Memory Store ──────────────────────────────────────────────────────────
const rooms = [
  { id: uuidv4(), name: 'The Void', description: 'Talk into the darkness.', members: 0 },
  { id: uuidv4(), name: 'Midnight Thoughts', description: 'Share what keeps you up at night.', members: 0 },
  { id: uuidv4(), name: 'Confessions', description: 'Say what you could never say out loud.', members: 0 },
  { id: uuidv4(), name: 'Random Chaos', description: 'Anything goes. Truly anything.', members: 0 },
];

// roomId -> array of message objects
const messages = {};

// socketId -> { ghostName, roomId }
const users = {};

// ─── Ghost Name Generator ─────────────────────────────────────────────────────
const adjectives = ['Silent', 'Hollow', 'Cursed', 'Fading', 'Drifting', 'Lurking', 'Phantom', 'Veiled', 'Eerie', 'Misty', 'Wandering', 'Forgotten', 'Hidden', 'Shadowy', 'Pale'];
const nouns = ['Specter', 'Wraith', 'Shade', 'Revenant', 'Haunt', 'Apparition', 'Phantom', 'Spirit', 'Echo', 'Wisp', 'Shadow', 'Specter', 'Ghoul', 'Poltergeist', 'Banshee'];

function generateGhostName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${noun}${num}`;
}

// ─── REST Endpoints ───────────────────────────────────────────────────────────
app.get('/api/rooms', (req, res) => {
  res.json(rooms);
});

app.post('/api/rooms', (req, res) => {
  const { name, description } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Room name is required' });
  }
  const newRoom = {
    id: uuidv4(),
    name: name.trim().slice(0, 40),
    description: (description || '').trim().slice(0, 100),
    members: 0,
  };
  rooms.push(newRoom);
  io.emit('rooms:updated', rooms);
  res.status(201).json(newRoom);
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  res.json(messages[roomId] || []);
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const ghostName = generateGhostName();
  users[socket.id] = { ghostName, roomId: null };

  // Send ghost name to the connecting client
  socket.emit('ghost:assigned', { ghostName });

  // Client can re-request its ghost name after mounting (fixes race condition)
  socket.on('ghost:request', () => {
    socket.emit('ghost:assigned', { ghostName: users[socket.id]?.ghostName || ghostName });
  });

  // Join a room
  socket.on('room:join', ({ roomId }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    // Leave previous room if any
    const prev = users[socket.id]?.roomId;
    if (prev) {
      socket.leave(prev);
      const prevRoom = rooms.find((r) => r.id === prev);
      if (prevRoom) prevRoom.members = Math.max(0, prevRoom.members - 1);
      io.to(prev).emit('room:user_left', { ghostName: users[socket.id].ghostName });
      // Clear history when user leaves
      delete messages[prev];
    }

    socket.join(roomId);
    users[socket.id].roomId = roomId;
    room.members += 1;

    // Send existing messages
    socket.emit('room:history', messages[roomId] || []);

    // Notify others
    io.to(roomId).emit('room:user_joined', { ghostName });
    io.emit('rooms:updated', rooms);
  });

  // Leave a room explicitly
  socket.on('room:leave', () => {
    const roomId = users[socket.id]?.roomId;
    if (!roomId) return;
    socket.leave(roomId);
    const room = rooms.find((r) => r.id === roomId);
    if (room) room.members = Math.max(0, room.members - 1);
    io.to(roomId).emit('room:user_left', { ghostName: users[socket.id].ghostName });
    // Clear history when user leaves
    delete messages[roomId];
    users[socket.id].roomId = null;
    io.emit('rooms:updated', rooms);
  });

  // Send a chat message
  socket.on('message:send', ({ roomId, content }) => {
    if (!content || content.trim().length === 0) return;
    if (!messages[roomId]) messages[roomId] = [];

    const msg = {
      id: uuidv4(),
      author: users[socket.id]?.ghostName || 'Unknown Ghost',
      content: content.trim().slice(0, 500),
      timestamp: Date.now(),
    };

    // Keep only last 200 messages per room
    messages[roomId].push(msg);
    if (messages[roomId].length > 200) messages[roomId].shift();

    io.to(roomId).emit('message:received', msg);
  });

  // Delete a message (only author can delete)
  socket.on('message:delete', ({ roomId, messageId }) => {
    if (!messages[roomId]) return;
    const authorName = users[socket.id]?.ghostName;
    const idx = messages[roomId].findIndex((m) => m.id === messageId && m.author === authorName);
    if (idx === -1) return;
    messages[roomId].splice(idx, 1);
    io.to(roomId).emit('message:deleted', { messageId });
  });

  // Edit a message (only author can edit)
  socket.on('message:edit', ({ roomId, messageId, content }) => {
    if (!messages[roomId] || !content || content.trim().length === 0) return;
    const authorName = users[socket.id]?.ghostName;
    const msg = messages[roomId].find((m) => m.id === messageId && m.author === authorName);
    if (!msg) return;
    msg.content = content.trim().slice(0, 500);
    msg.edited = true;
    io.to(roomId).emit('message:edited', { messageId, content: msg.content });
  });

  // Typing indicator
  socket.on('typing:start', ({ roomId }) => {
    socket.to(roomId).emit('typing:update', { ghostName, typing: true });
  });
  socket.on('typing:stop', ({ roomId }) => {
    socket.to(roomId).emit('typing:update', { ghostName, typing: false });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomId = users[socket.id]?.roomId;
    if (roomId) {
      const room = rooms.find((r) => r.id === roomId);
      if (room) room.members = Math.max(0, room.members - 1);
      io.to(roomId).emit('room:user_left', { ghostName: users[socket.id].ghostName });
      // Clear history when user disconnects
      delete messages[roomId];
      io.emit('rooms:updated', rooms);
    }
    delete users[socket.id];
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`👻 Ghost Protocol server running on http://localhost:${PORT}`);
});
