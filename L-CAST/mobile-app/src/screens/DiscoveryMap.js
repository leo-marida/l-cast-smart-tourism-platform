import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { GOOGLE_MAPS_API_KEY } from '@env'; 

// 1. ADD 'route' TO PROPS so we can receive data from Home
export default function DiscoveryMap({ route }) {
  const [location, setLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [travelTime, setTravelTime] = useState(null);

  // Initial Setup: Get Permission & Current Location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      
      // Fetch all POIs to display on map
      fetchPois(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  // 2. NEW LOGIC: Listen for "Home Screen Click"
  // If user clicked a card in Home, 'route.params' will contain that POI
  useEffect(() => {
    if (route.params?.targetPoi) {
      const target = route.params.targetPoi;
      console.log("Received Navigation Target:", target.name);
      
      // Trigger the same logic as if we clicked the marker manually
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
    
    // Handle different data structures (lat vs coordinates[1])
    const destLat = destination.lat || (destination.location ? destination.location.coordinates[1] : 0);
    const destLon = destination.lon || (destination.location ? destination.location.coordinates[0] : 0);
    
    const origin = `${location.latitude},${location.longitude}`;
    const dest = `${destLat},${destLon}`;

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.routes && data.routes.length > 0) {
        // Simple straight line for MVP visualization
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
    // Save selected POI to state to show the bottom card
    setSelectedPoi(poi);
    setTravelTime(null);
    setRouteCoords([]);
    // Calculate the route
    getRoutePreview(poi);
  };

  const handleNavigate = () => {
    if (!location || !selectedPoi) return;
    const destLat = selectedPoi.lat || selectedPoi.location?.coordinates[1];
    const destLon = selectedPoi.lon || selectedPoi.location?.coordinates[0];
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${destLat},${destLon}&travelmode=driving`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        showsUserLocation={true}
        // If we have a selected POI, center map on it. Otherwise default to Beirut.
        region={{
          latitude: selectedPoi ? (selectedPoi.lat || selectedPoi.location.coordinates[1]) : 33.8938,
          longitude: selectedPoi ? (selectedPoi.lon || selectedPoi.location.coordinates[0]) : 35.5018,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {pois.map((poi, index) => {
           const lat = poi.lat || (poi.location ? poi.location.coordinates[1] : 33.8938);
           const lon = poi.lon || (poi.location ? poi.location.coordinates[0] : 35.5018);

           return (
            <Marker
                key={index}
                coordinate={{ latitude: lat, longitude: lon }}
                title={poi.name}
                pinColor={poi.friction_index < 0.8 ? 'red' : 'green'} 
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
          <TouchableOpacity onPress={() => setSelectedPoi(null)} style={{marginTop:10, alignSelf:'center'}}>
              <Text style={{color:'gray'}}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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