import io from 'socket.io-client';
import api from './api'; // Import your axios instance to get Base URL

// Replace with your actual backend URL (e.g., http://192.168.1.5:3000)
const SOCKET_URL = api.defaults.baseURL; 

const socket = io(SOCKET_URL, {
    autoConnect: false, // We connect manually after login
    transports: ['websocket']
});

export default socket;