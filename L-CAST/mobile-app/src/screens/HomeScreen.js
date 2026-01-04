import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const [recommendations, setRecommendations] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // This ensures data is refreshed every time you navigate back to this screen
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [searchQuery]) // Dependency added to ensure fresh logic if query changes during focus
  );

  const loadData = async () => {
    // Only show full loading spinner on first load, not on refocus updates
    if (recommendations.length === 0) setLoading(true);

    let { status } = await Location.requestForegroundPermissionsAsync();
    let lat = 33.8938, lon = 35.5018;

    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({});
      lat = location.coords.latitude;
      lon = location.coords.longitude;
    }
    fetchDiscovery(lat, lon);
  };

  const fetchDiscovery = async (lat, lon) => {
    try {
      const res = await api.get(`/api/pois/discover?lat=${lat}&lon=${lon}&radius=50000`);
      let data = Array.isArray(res.data) ? res.data : (res.data.data || []);

      // SORTING FIX: Highest Safety (1.0) at the top
      data.sort((a, b) => (b.friction_index || 0) - (a.friction_index || 0));

      setRecommendations(data);

      // Apply search filter if user has typed something
      if (searchQuery && searchQuery.length > 0) {
        applyFilter(data, searchQuery);
      } else {
        setFilteredData(data);
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED SEARCH LOGIC ---
  const applyFilter = (data, text) => {
    const query = text.toUpperCase();

    const newData = data.filter(item => {
      // 1. Basic Fields
      const name = item.name ? item.name.toUpperCase() : '';
      const region = item.region ? item.region.toUpperCase() : '';

      // 2. Description (e.g., allows searching for "History", "Nature", "Cave")
      const desc = item.description ? item.description.toUpperCase() : '';

      // 3. Live Factors (e.g., allows searching for "Snow", "Rain", "Traffic")
      // We join all badge labels into one string to search them easily
      const factors = item.safety_factors
        ? item.safety_factors.map(f => f.label.toUpperCase()).join(' ')
        : '';

      // Return true if ANY field matches
      return name.includes(query) ||
        region.includes(query) ||
        desc.includes(query) ||
        factors.includes(query);
    });

    setFilteredData(newData);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      applyFilter(recommendations, text);
    } else {
      setFilteredData(recommendations);
    }
  };

  const toggleSave = async (poi) => {
    const isCurrentlySaved = poi.is_saved;
    const newStatus = !isCurrentlySaved;

    // Optimistic Update: Update both lists immediately
    const updateList = (list) => list.map(p => p.id === poi.id ? { ...p, is_saved: newStatus } : p);

    setRecommendations(updateList(recommendations));
    setFilteredData(updateList(filteredData));

    try {
      const url = newStatus ? '/api/pois/save' : '/api/pois/unsave';
      await api.post(url, { poi_id: poi.id });
    } catch (err) {
      console.error("Save failed", err);
      // Revert on failure
      const revertList = (list) => list.map(p => p.id === poi.id ? { ...p, is_saved: isCurrentlySaved } : p);
      setRecommendations(revertList(recommendations));
      setFilteredData(revertList(filteredData));
    }
  };

  const renderPOI = ({ item }) => {
    let scoreColor = '#27ae60'; // Green
    if (item.friction_index < 0.7) scoreColor = '#f39c12'; // Orange
    if (item.friction_index < 0.4) scoreColor = '#c0392b'; // Red

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Map', { targetPoi: item })}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.region}>{item.region}</Text>
                {item.distance_meters && (
                  <View style={styles.distBadge}>
                    <Ionicons name="navigate-circle-outline" size={14} color="#555" />
                    <Text style={styles.distText}>{(item.distance_meters / 1000).toFixed(1)} km</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.score, { color: scoreColor }]}>
                Safety: {Math.round(item.friction_index * 100)}%
              </Text>
              <TouchableOpacity onPress={() => toggleSave(item)} style={{ marginTop: 5, padding: 5 }}>
                <Ionicons
                  name={item.is_saved ? "bookmark" : "bookmark-outline"}
                  size={26}
                  color={item.is_saved ? "#007AFF" : "gray"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.factorContainer}>
            {item.safety_factors && item.safety_factors.map((factor, index) => (
              <View key={index} style={styles.factorBadge}>
                <Text style={styles.factorText}>{factor.icon} {factor.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>Analyzing Real-Time Context...</Text>
          <Text style={styles.loadingSubText}>Updating safety scores & weather for all locations</Text>
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Context Rankings</Text>

      {/* --- SEARCH BAR UI --- */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          // ✅ UPDATE THIS LINE:
          placeholder="Search 'Snow', 'Ruins', 'Beirut'..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="gray" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPOI}
        contentContainerStyle={{ paddingBottom: 20 }}
        extraData={filteredData}
        // NEW: Show message when list is empty
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No results found.</Text>
            <Text style={styles.emptySubText}>Try searching for a different name or keyword.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 15 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, marginTop: 10, color: '#333' },

  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 60, 
    opacity: 0.8 
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#555', 
    marginTop: 10 
  },
  emptySubText: { 
    fontSize: 14, 
    color: '#888', 
    marginTop: 5 
  },
  searchInput: { flex: 1, fontSize: 16 },

  card: { backgroundColor: 'white', padding: 13, borderRadius: 15, marginBottom: 15, elevation: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#2c3e50', width: '65%' }, // added width to prevent text overlap
  region: { fontSize: 14, color: 'gray' },
  score: { fontWeight: '900', fontSize: 16 },

  distBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  distText: { fontSize: 12, color: '#333', marginLeft: 2 },

  factorContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factorBadge: { backgroundColor: '#f0f2f5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  factorText: { fontSize: 12, fontWeight: '600', color: '#555' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});