import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Laptop's IP Address so the phone can see the server
const BASE_URL = 'http://192.168.0.149:3000'; 

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Automatically attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

