import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
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

  useFocusEffect(
    useCallback(() => {
      // 1. Initial Load
      loadData(false);

      // 2. Auto-Refresh every 15 seconds
      const intervalId = setInterval(() => {
        console.log("Refreshing Context Data...");
        loadData(true); // Silent refresh
      }, 15000);

      return () => clearInterval(intervalId);
    }, [])
  );

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);

    // Default: Beirut
    let lat = 33.8938; 
    let lon = 35.5018; 

    try {
      // ✅ FIX: Add Timeout to Location Request (Prevents infinite loading)
      const locationTask = async () => {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') throw new Error("Permission Denied");
          return await Location.getCurrentPositionAsync({});
      };

      // Race: If GPS takes > 4 seconds, use default location
      const location = await Promise.race([
          locationTask(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Location Timeout")), 4000))
      ]);

      lat = location.coords.latitude;
      lon = location.coords.longitude;
      
    } catch (err) {
      console.log("Location skipped or timed out, using default:", err.message);
    } 

    // Fetch Data
    await fetchDiscovery(lat, lon, silent);
  };

  const fetchDiscovery = async (lat, lon, silent) => {
    try {
      const res = await api.get(`/api/pois/discover?lat=${lat}&lon=${lon}&radius=50000`);
      let data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      
      // Sort: Safest (Highest Friction Index) First
      data = data.sort((a, b) => b.friction_index - a.friction_index);

      setRecommendations(data);
      
      // Apply Search Filter if text exists
      if (searchQuery) {
          const lowerText = searchQuery.toLowerCase();
          setFilteredData(data.filter(item => 
              (item.name && item.name.toLowerCase().includes(lowerText)) || 
              (item.region && item.region.toLowerCase().includes(lowerText))
          ));
      } else {
          setFilteredData(data);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      // ✅ FIX: Ensure loading always stops
      if (!silent) setLoading(false);
    }
  };

  // --- SEARCH LOGIC ---
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const lowerText = text.toLowerCase();
      const newData = recommendations.filter(item => {
        return (item.name && item.name.toLowerCase().includes(lowerText)) || 
               (item.region && item.region.toLowerCase().includes(lowerText));
      });
      setFilteredData(newData);
    } else {
      setFilteredData(recommendations);
    }
  };

  const toggleSave = async (poi) => {
    const isCurrentlySaved = poi.is_saved;
    const newStatus = !isCurrentlySaved;
    
    const updateList = (list) => list.map(p => p.id === poi.id ? { ...p, is_saved: newStatus } : p);
    setRecommendations(updateList(recommendations));
    setFilteredData(updateList(filteredData));

    try {
      const url = newStatus ? '/api/pois/save' : '/api/pois/unsave';
      await api.post(url, { poi_id: poi.id });
    } catch (err) {
      setRecommendations(updateList(recommendations));
      setFilteredData(updateList(filteredData));
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
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Text style={styles.region}>{item.region}</Text>
                    {item.distance_meters && (
                        <View style={styles.distBadge}>
                            <Ionicons name="navigate-circle-outline" size={14} color="#555" />
                            <Text style={styles.distText}>{(item.distance_meters / 1000).toFixed(1)} km</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={{alignItems:'flex-end'}}>
                <Text style={[styles.score, {color: scoreColor}]}>
                    Safety: {Math.round(item.friction_index * 100)}%
                </Text>
                <TouchableOpacity onPress={() => toggleSave(item)} style={{marginTop: 5}}>
                    <Ionicons name={item.is_saved ? "bookmark" : "bookmark-outline"} size={24} color={item.is_saved ? "#007AFF" : "gray"} />
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

  if (loading) return <ActivityIndicator size="large" color="#007AFF" style={{flex: 1, marginTop: 50}} />;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Context Rankings</Text>
      
      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or region..."
          value={searchQuery}
          onChangeText={handleSearch}
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 15 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, marginTop: 10, color:'#333' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, marginBottom: 15, elevation: 2 },
  searchInput: { flex: 1, fontSize: 16 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  name: { fontSize: 18, fontWeight: 'bold', color:'#2c3e50' },
  region: { fontSize: 14, color: 'gray' },
  score: { fontWeight: '900', fontSize: 16 },
  distBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  distText: { fontSize: 12, color: '#333', marginLeft: 2 },
  factorContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factorBadge: { backgroundColor: '#f0f2f5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, flexDirection:'row', alignItems:'center' },
  factorText: { fontSize: 12, fontWeight: '600', color: '#555' },
});