const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Check if certificate and password files exist
const certificatePath = '/certs/certificate.pfx';
const passwordPath = '/certs/certificate_password.txt';
const hasCertificate = fs.existsSync(certificatePath);
const hasPassword = fs.existsSync(passwordPath);

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

const ioOptions = {
  cors: { origin: '*', methods: ['GET', 'POST'] }
};

let server;

// If certificate and password are available, use HTTPS; otherwise, use HTTP
if (hasCertificate && hasPassword) {
  const password = fs.readFileSync(passwordPath, 'utf8').trim(); // Read password from file
  const options = {
    pfx: fs.readFileSync(certificatePath), // Load the certificate
    passphrase: password // Provide the password for the certificate
  };

  server = https.createServer(options, app);
  console.log('Using HTTPS for signaling server');
} else {
  server = http.createServer(app);
  console.log(`Using HTTP for signaling server`);
}

const io = new Server(server, ioOptions);

const rooms = {}; // Track active rooms and participants
const userNames = {}; // Map socket IDs to usernames
const userStatuses = {}; // Map socket IDs to mute and video-off statuses

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle room creation
  socket.on('create-room', ({ username }) => {
    const roomId = uuidv4();
    rooms[roomId] = [{ socketId: socket.id, username }];
    userNames[socket.id] = username;
    userStatuses[socket.id] = { isMuted: false, isVideoOff: false };
    socket.join(roomId);
    console.log(`Room created: ${roomId} by user: ${username}`);
    socket.emit('room-created', { roomId });
  });

  // Handle joining a room
  socket.on('join-room', ({ roomId, username }) => {
    if (rooms[roomId]) {
      rooms[roomId].push({ socketId: socket.id, username });
      userNames[socket.id] = username;
      socket.join(roomId);
      console.log(`User ${username} joined room: ${roomId}`);
      socket.emit('room-joined', {
        roomId,
        users: rooms[roomId], // Send details of all users in the room
      });
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        username,
      });
    } else {
      socket.emit('room-full'); // Room does not exist or is full
    }
  });

  // Handle signaling data
  socket.on('signal', ({ roomId, data, to }) => {
    io.to(to).emit('signal', { sender: socket.id, data });
  });

  // Handle mute and video-off status updates
  socket.on('update-status', ({ roomId, isMuted, isVideoOff }) => {
    if (userStatuses[socket.id]) {
      userStatuses[socket.id] = { isMuted, isVideoOff };
      console.log(`User ${userNames[socket.id]} updated status: muted=${isMuted}, videoOff=${isVideoOff}`);
      socket.to(roomId).emit('update-status', {
        socketId: socket.id,
        isMuted,
        isVideoOff,
      });
    }
  });

  // Handle chat updates
  socket.on('send-chat', ({ roomId, message }) => {
    socket.to(roomId).emit('send-chat', {
      socketId: socket.id,
      message: message,
    });
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const userIndex = rooms[roomId].findIndex((user) => user.socketId === socket.id);
      if (userIndex !== -1) {
        const username = userNames[socket.id];
        console.log(`User ${username} disconnected from room: ${roomId}`);
        rooms[roomId].splice(userIndex, 1); // Remove user from the room
        if (rooms[roomId].length === 0) {
          delete rooms[roomId]; // Delete the room if empty
          console.log(`Deleted room: ${roomId}`);
        } else {
          socket.to(roomId).emit('user-left', { socketId: socket.id });
        }
        delete userNames[socket.id];
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
server.listen(2087, () => {
  const protocol = hasCertificate && hasPassword ? 'HTTPS' : 'HTTP';
  console.log(`Signaling server running on ${protocol} port 2087`);
});
