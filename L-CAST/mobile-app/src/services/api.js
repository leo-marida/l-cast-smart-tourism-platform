import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Laptop's IP Address so the phone can see the server
const BASE_URL = 'http://192.168.0.104:3000'; 

const api = axios.create({
  baseURL: BASE_URL,
});

// Automatically attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export default api;