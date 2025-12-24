import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import api from '../services/api';

const categories = ["Adventure", "Culture", "Food", "Nature", "Nightlife"];

export default function OnboardingScreen({ navigation }) {
  const [interests, setInterests] = useState({
    Adventure: 0.5, Culture: 0.5, Food: 0.5, Nature: 0.5, Nightlife: 0.5
  });

  const updatePreference = (cat, val) => {
    setInterests({ ...interests, [cat]: val });
  };

  const saveProfile = async () => {
    try {
      // Convert interests map to a flat vector [0.9, 0.2, ...]
      const vector = categories.map(cat => interests[cat]);
      await api.post('/auth/update-interests', { interest_vector: vector });
      Alert.alert("Success", "Profile Created! Redirecting to Discovery...");
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert("Error", "Could not save preferences.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What do you love?</Text>
      <Text style={styles.subtitle}>Customize your interest vector to train the CARS engine.</Text>
      
      {categories.map(cat => (
        <View key={cat} style={styles.row}>
          <Text style={styles.catLabel}>{cat}</Text>
          <View style={styles.btnGroup}>
            <TouchableOpacity onPress={() => updatePreference(cat, 0.2)} style={[styles.btn, interests[cat] === 0.2 && styles.active]}><Text>Low</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => updatePreference(cat, 0.5)} style={[styles.btn, interests[cat] === 0.5 && styles.active]}><Text>Mid</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => updatePreference(cat, 0.9)} style={[styles.btn, interests[cat] === 0.9 && styles.active]}><Text>High</Text></TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
        <Text style={styles.saveBtnText}>Generate My Experience</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#666', marginBottom: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  catLabel: { fontSize: 16, fontWeight: '600' },
  btnGroup: { flexDirection: 'row' },
  btn: { padding: 8, borderWidth: 1, borderColor: '#ddd', marginLeft: 5, borderRadius: 5 },
  active: { backgroundColor: '#3498db', borderColor: '#3498db' },
  saveBtn: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, marginTop: 40, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});