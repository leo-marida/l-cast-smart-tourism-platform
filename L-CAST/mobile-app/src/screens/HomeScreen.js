import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    let lat = 33.8938, lon = 35.5018; // Default Beirut

    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({});
      lat = location.coords.latitude;
      lon = location.coords.longitude;
    }
    fetchDiscovery(lat, lon);
  };

  const fetchDiscovery = async (lat, lon) => {
    try {
      // Radius 100km to show ALL of Lebanon
      const res = await api.get(`/api/pois/discover?lat=${lat}&lon=${lon}&radius=100000`);
      const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setRecommendations(data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (poi) => {
    const isCurrentlySaved = poi.is_saved;
    const newStatus = !isCurrentlySaved;
    setRecommendations(current => current.map(p => p.id === poi.id ? { ...p, is_saved: newStatus } : p));
    try {
      const url = newStatus ? '/api/pois/save' : '/api/pois/unsave';
      await api.post(url, { poi_id: poi.id });
    } catch (err) {
      setRecommendations(current => current.map(p => p.id === poi.id ? { ...p, is_saved: isCurrentlySaved } : p));
    }
  };

  const renderPOI = ({ item }) => {
    // Determine Card Color based on Score
    // Green > 70%, Yellow > 40%, Red < 40%
    let scoreColor = '#27ae60';
    if (item.friction_index < 0.7) scoreColor = '#f39c12';
    if (item.friction_index < 0.4) scoreColor = '#c0392b';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Map', { targetPoi: item })}
      >
        <View style={styles.card}>
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.region}>{item.region}</Text>
                {/* NEW: Distance Badge */}
                {item.distance_meters && (
                  <View style={styles.distBadge}>
                    <Ionicons name="navigate-circle-outline" size={14} color="#555" />
                    <Text style={styles.distText}>
                      {(item.distance_meters / 1000).toFixed(1)} km
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.score, { color: scoreColor }]}>
                Safety: {Math.round(item.friction_index * 100)}%
              </Text>
              <TouchableOpacity onPress={() => toggleSave(item)} style={{ marginTop: 5 }}>
                <Ionicons
                  name={item.is_saved ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={item.is_saved ? "#007AFF" : "gray"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* FACTORS GRID (The "Why") */}
          <View style={styles.factorContainer}>
            {item.safety_factors && item.safety_factors.map((factor, index) => (
              <View key={index} style={styles.factorBadge}>
                <Text style={styles.factorText}>{factor.icon} {factor.label}</Text>
              </View>
            ))}
          </View>

          {/* WARNING FOR LOW SCORES */}
          {item.friction_index < 0.5 && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={16} color="#c0392b" />
              <Text style={styles.warningText}>Not Recommended due to conditions.</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, marginTop: 50 }} />;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Context Rankings</Text>
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPOI}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 15 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, marginTop: 10, color: '#333' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  region: { fontSize: 14, color: 'gray' },
  score: { fontWeight: '900', fontSize: 16 },

  // New Styles for Factors
  factorContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factorBadge: { backgroundColor: '#f0f2f5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  factorText: { fontSize: 12, fontWeight: '600', color: '#555' },

  warningBox: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 8, backgroundColor: '#ffebee', borderRadius: 8 },
  warningText: { color: '#c0392b', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8
  },
  distText: { fontSize: 12, color: '#333', marginLeft: 2 },
});