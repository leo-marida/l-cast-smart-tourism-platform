import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; // Icon Library
import api from '../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Toggle state

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Input", "Please enter email and password.");
      return;
    }

    setLoading(true);
    console.log(`Attempting login to: ${api.defaults.baseURL}/auth/login`);

    try {
      const res = await api.post('/auth/login', { email, password });
      
      console.log("Login Success:", res.data);
      await AsyncStorage.setItem('userToken', res.data.token);
      await AsyncStorage.setItem('username', res.data.username); 
      // Navigate to Home or Onboarding
      navigation.replace('Home');
      
    } catch (err) {
      console.error("Login Error:", err);
      // specific error message
      const msg = err.response?.data?.error || "Check your internet connection or IP address.";
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>L-CAST</Text>
      <Text style={styles.subtitle}>Context-Aware Tourism</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      {/* Password Row with Eye Icon */}
      <View style={styles.passwordContainer}>
        <TextInput 
          style={styles.passwordInput} 
          placeholder="Password" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry={!showPassword} // Toggle logic
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="gray" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  logo: { fontSize: 40, fontWeight: 'bold', color: '#007AFF', textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15 },
  
  // New Styles for Password Eye
  passwordContainer: { 
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', 
    borderRadius: 10, marginBottom: 15, paddingHorizontal: 10 
  },
  passwordInput: { flex: 1, paddingVertical: 15 },
  eyeIcon: { padding: 10 },

  btn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: 20, textAlign: 'center', color: '#007AFF' }
});