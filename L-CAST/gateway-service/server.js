require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http'); 
const { Server } = require("socket.io"); 

const app = express();
app.use(helmet()); // Security Headers
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/api/pois', require('./routes/poiRoutes')); // Handles Discovery & Friction
app.use('/api/social', require('./routes/socialRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/messages', require('./routes/messages'));

// --- SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from app
        methods: ["GET", "POST"]
    }
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Store user socket connections (Map UserID -> SocketID)
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. User joins their own "Room" based on their User ID
    socket.on('join', (userId) => {
        socket.join(userId.toString());
        userSockets.set(userId, socket.id);
        console.log(`User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// --- CHANGE app.listen TO server.listen ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { // <--- CHANGED from app.listen
    console.log(`Server running on port ${PORT}`);
});
