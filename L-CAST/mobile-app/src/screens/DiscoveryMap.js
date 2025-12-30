import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
// Try to import, but handle if missing
import { GOOGLE_MAPS_API_KEY } from '@env'; 

export default function DiscoveryMap({ route, navigation }) {
  const [userLocation, setUserLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [travelTime, setTravelTime] = useState(null);

  // --- HELPER: Safely get Lat/Lon no matter the data structure ---
  const getLatLon = (item) => {
    if (!item) return { lat: 33.8938, lon: 35.5018 }; // Default Beirut
    
    // Check flattened format (from Backend)
    if (item.lat && item.lon) return { lat: parseFloat(item.lat), lon: parseFloat(item.lon) };
    
    // Check nested Geometry format (GeoJSON standard)
    if (item.location?.coordinates) {
        return { lat: item.location.coordinates[1], lon: item.location.coordinates[0] };
    }

    // Check Google Maps format
    if (item.latitude && item.longitude) return { lat: item.latitude, lon: item.longitude };

    return { lat: 33.8938, lon: 35.5018 }; // Fallback
  };

  // 1. Initial Setup: Get Location & Fetch POIs
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc.coords);
      
      // Load POIs around user
      fetchPois(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  // 2. Handle incoming clicks from Home Screen
  useEffect(() => {
    if (route.params?.targetPoi) {
      const target = route.params.targetPoi;
      // Wait a bit for map to load, then select
      setTimeout(() => onMarkerPress(target), 500);
    }
  }, [route.params]);

  const fetchPois = async (lat, lon) => {
    try {
      // Fetch similar to Home Screen
      const res = await api.get(`/api/pois/discover?lat=${lat}&lon=${lon}`);
      let data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      
      // Sort by Safety (Safest First) just like Home
      data.sort((a, b) => (b.friction_index || 0) - (a.friction_index || 0));
      
      setPois(data);
    } catch (err) {
      console.log("Map Fetch Error (Check API URL):", err);
    }
  };

  const getRoutePreview = async (destination) => {
    if (!userLocation || !destination) return;
    
    // If no API Key, skip route drawing to prevent "Network Error"
    if (!GOOGLE_MAPS_API_KEY) {
        console.log("Skipping Route: No Google Maps API Key found in .env");
        return;
    }

    const { lat: destLat, lon: destLon } = getLatLon(destination);
    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const dest = `${destLat},${destLon}`;

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_API_KEY}`;
      
      // Use standard fetch here (External API, not our Backend)
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.routes && data.routes.length > 0) {
        // Simple straight line fallback if decoding is too complex without library
        // Or if you have a decoder, use it. Ideally we just draw Start -> End for MVP.
        setRouteCoords([
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: destLat, longitude: destLon }
        ]);
        setTravelTime(data.routes[0].legs[0].duration.text);
      } else {
         // Gracefully handle if Google refuses key
         console.log("Google Maps Route Error:", data.error_message || "No routes");
      }
    } catch (error) {
      console.log("Direction Network Error", error);
    }
  };

  const onMarkerPress = (poi) => {
    setSelectedPoi(poi);
    setTravelTime(null);
    setRouteCoords([]);
    getRoutePreview(poi);
  };

  const handleNavigate = () => {
    if (!userLocation || !selectedPoi) return;
    const { lat: destLat, lon: destLon } = getLatLon(selectedPoi);
    
    // Open Google Maps App externally
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${destLat},${destLon}&travelmode=driving`;
    Linking.openURL(url);

    // Reset UI
    setSelectedPoi(null);
  };

  const handleClose = () => {
    setSelectedPoi(null);
    setRouteCoords([]);
  };

  // Determine Map Region
  const { lat: regionLat, lon: regionLon } = selectedPoi 
     ? getLatLon(selectedPoi) 
     : (userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : { lat: 33.8938, lon: 35.5018 });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <MapView 
        style={styles.map} 
        showsUserLocation={true}
        // Use key to force refresh if needed
        region={{
          latitude: regionLat,
          longitude: regionLon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {pois.map((poi, index) => {
           const { lat, lon } = getLatLon(poi);
           
           // Color Logic
           const isSelected = selectedPoi && selectedPoi.id === poi.id;
           let pinColor = 'green';
           if (poi.friction_index < 0.8) pinColor = 'orange';
           if (poi.friction_index < 0.5) pinColor = 'red';
           
           if (isSelected) pinColor = 'blue'; // Selected is Blue

           return (
            <Marker
                key={`${poi.id}-${index}`}
                coordinate={{ latitude: lat, longitude: lon }}
                title={poi.name}
                pinColor={pinColor} 
                onPress={() => onMarkerPress(poi)}
            />
           )
        })}
        
        {/* Draw Route Line if exists */}
        {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#4285F4" />
        )}
      </MapView>

      {/* BOTTOM POPUP CARD */}
      {selectedPoi && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{selectedPoi.name}</Text>
              <TouchableOpacity onPress={handleClose}>
                 <Ionicons name="close-circle" size={24} color="#999" />
              </TouchableOpacity>
          </View>
          
          <Text style={styles.regionText}>{selectedPoi.region}</Text>
          
          {/* Safety Badge in Card */}
          <View style={[styles.badge, { backgroundColor: selectedPoi.friction_index < 0.8 ? '#f39c12' : '#27ae60' }]}>
               <Text style={styles.badgeText}>Safety: {Math.round((selectedPoi.friction_index || 1) * 100)}%</Text>
          </View>

          {travelTime && <Text style={styles.timeText}>⏱️ Approx {travelTime} drive</Text>}
          
          <Text style={styles.desc} numberOfLines={3}>
             {selectedPoi.description || "No description available."}
          </Text>
          
          <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
            <Ionicons name="map" size={20} color="white" style={{marginRight: 8}} />
            <Text style={styles.navText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  
  backBtn: {
      position: 'absolute', top: 50, left: 20, zIndex: 10,
      backgroundColor: 'white', padding: 10, borderRadius: 20, elevation: 5
  },

  card: { 
      position: 'absolute', bottom: 30, left: 20, right: 20, 
      backgroundColor: 'white', padding: 20, borderRadius: 20, 
      elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', width: '90%' },
  regionText: { color: 'gray', marginBottom: 10 },
  
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  timeText: { color: '#d35400', fontWeight: '600', marginBottom: 10 },
  desc: { fontSize: 13, color: '#555', marginBottom: 15, lineHeight: 18 },
  
  navBtn: { 
      backgroundColor: '#4285F4', padding: 12, borderRadius: 12, 
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center' 
  },
  navText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});