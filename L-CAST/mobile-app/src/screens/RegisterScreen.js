import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const interests = [0.5, 0.5, 0.5, 0.5, 0.5]; 
      
      console.log("Registering user...");
      const res = await api.post('/auth/register', { 
        username, email, password, interests 
      });
      
      console.log("Register Success:", res.data);
      Alert.alert('Success', 'Account created! Please login.');
      navigation.navigate('Login');

    } catch (err) {
      console.error("Register Failed:", err);
      const msg = err.response?.data?.error || "Registration failed. Check network.";
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join L-CAST</Text>
      
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none"/>
      
      {/* Password Row with Eye Icon */}
      <View style={styles.passwordContainer}>
        <TextInput 
          style={styles.passwordInput} 
          placeholder="Password" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry={!showPassword} 
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="gray" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign Up</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15 },
  
  passwordContainer: { 
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', 
    borderRadius: 10, marginBottom: 15, paddingHorizontal: 10 
  },
  passwordInput: { flex: 1, paddingVertical: 15 },
  eyeIcon: { padding: 10 },

  btn: { backgroundColor: '#27ae60', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: 20, textAlign: 'center', color: '#007AFF' }
});