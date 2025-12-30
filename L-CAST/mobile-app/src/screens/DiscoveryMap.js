import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
// Ensure this import matches your setup
import { GOOGLE_MAPS_API_KEY } from '@env'; 

export default function DiscoveryMap({ route }) {
  const [location, setLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [travelTime, setTravelTime] = useState(null);

  // 1. Initial Setup
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      fetchPois(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  // 2. Handle incoming clicks from Home Screen
  useEffect(() => {
    if (route.params?.targetPoi) {
      const target = route.params.targetPoi;
      onMarkerPress(target);
    }
  }, [route.params]);

  const fetchPois = async (lat, lon) => {
    try {
      const res = await api.get(`/api/pois/discover?lat=${lat}&lon=${lon}`);
      const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setPois(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getRoutePreview = async (destination) => {
    if (!location) return;
    
    const destLat = destination.lat || (destination.location ? destination.location.coordinates[1] : 0);
    const destLon = destination.lon || (destination.location ? destination.location.coordinates[0] : 0);
    const origin = `${location.latitude},${location.longitude}`;
    const dest = `${destLat},${destLon}`;

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.routes && data.routes.length > 0) {
        // Decode polyline logic is complex, for MVP simple straight line or bounds is okay
        // Here we just draw start to end for simplicity unless you have a decoder
        setRouteCoords([
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: destLat, longitude: destLon }
        ]);
        setTravelTime(data.routes[0].legs[0].duration.text);
      }
    } catch (error) {
      console.log("Direction Error", error);
    }
  };

  const onMarkerPress = (poi) => {
    setSelectedPoi(poi); // Sets it as active (Turning it RED)
    setTravelTime(null);
    setRouteCoords([]);
    getRoutePreview(poi);
  };

  const handleNavigate = () => {
    if (!location || !selectedPoi) return;
    const destLat = selectedPoi.lat || selectedPoi.location?.coordinates[1];
    const destLon = selectedPoi.lon || selectedPoi.location?.coordinates[0];
    
    // Open Google Maps App
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${destLat},${destLon}&travelmode=driving`;
    Linking.openURL(url);

    // ✅ FIX: Turn back to Green immediately after clicking Open
    setSelectedPoi(null);
  };

  const handleClose = () => {
    // ✅ FIX: Turn back to Green when closing card
    setSelectedPoi(null);
    setRouteCoords([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MapView 
        style={styles.map} 
        showsUserLocation={true}
        region={{
          latitude: selectedPoi ? (selectedPoi.lat || selectedPoi.location.coordinates[1]) : (location?.latitude || 33.8938),
          longitude: selectedPoi ? (selectedPoi.lon || selectedPoi.location.coordinates[0]) : (location?.longitude || 35.5018),
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {pois.map((poi, index) => {
           const lat = poi.lat || (poi.location ? poi.location.coordinates[1] : 33.8938);
           const lon = poi.lon || (poi.location ? poi.location.coordinates[0] : 35.5018);
           
           // ✅ LOGIC: If this is the Selected POI, make it RED.
           // Otherwise, use the Friction color (Green if safe, Orange if risky)
           const isSelected = selectedPoi && selectedPoi.id === poi.id;
           const baseColor = poi.friction_index < 0.8 ? 'orange' : 'green';
           const finalColor = isSelected ? 'red' : baseColor;

           return (
            <Marker
                key={index}
                coordinate={{ latitude: lat, longitude: lon }}
                title={poi.name}
                pinColor={finalColor} 
                onPress={() => onMarkerPress(poi)}
            />
           )
        })}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#4285F4" />}
      </MapView>

      {selectedPoi && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedPoi.name}</Text>
          {travelTime && <Text style={styles.timeText}>⏱️ {travelTime} drive</Text>}
          <Text style={styles.desc}>{selectedPoi.xai_explanation || selectedPoi.description}</Text>
          
          <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
            <Text style={styles.navText}>Open in Google Maps</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleClose} style={{marginTop:10, alignSelf:'center'}}>
              <Text style={{color:'gray'}}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  card: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  timeText: { color: '#d35400', fontWeight: 'bold', marginVertical: 5 },
  desc: { fontSize: 12, color: '#555', marginBottom: 10 },
  navBtn: { backgroundColor: '#4285F4', padding: 10, borderRadius: 8, alignItems: 'center' },
  navText: { color: 'white', fontWeight: 'bold' }
});