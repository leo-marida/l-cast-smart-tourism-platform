require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http'); 
const path = require('path');
const { Server } = require("socket.io"); 

const app = express();

// --- MIDDLEWARE ---
// Disable CSP policy for images so they load in React Native
app.use(helmet({ crossOriginResourcePolicy: false })); 
app.use(cors());
app.use(express.json());

// --- SERVE IMAGES ---
// This is the bridge that lets the app see your Docker volume files
app.use('/uploads', express.static('/uploads'));

// --- ROUTES ---
app.use('/auth', require('./routes/authRoutes'));
app.use('/api/social', require('./routes/socialRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/pois', require('./routes/poiRoutes')); // Contains Discover logic now

// --- SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

const userSockets = new Map();

io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        socket.join(userId.toString());
        userSockets.set(userId, socket.id);
    });
    socket.on('disconnect', () => {
        for (let [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                break;
            }
        }

        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`L-CAST Secure Unified Gateway Online on Port ${PORT}`);
});