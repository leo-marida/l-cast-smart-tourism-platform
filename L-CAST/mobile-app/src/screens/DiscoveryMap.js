import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../services/api';
// IMPORT THE KEY SECURELY
import { GOOGLE_MAPS_API_KEY } from '@env'; 

export default function DiscoveryMap() {
  const [location, setLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [travelTime, setTravelTime] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      fetchPois(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  const fetchPois = async (lat, lon) => {
    try {
      const res = await api.get(`/api/discover?lat=${lat}&lon=${lon}`);
      setPois(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const getRoutePreview = async (destination) => {
    if (!location) return;
    
    // SECURE USE OF ENV VAR
    const origin = `${location.latitude},${location.longitude}`;
    const dest = `${destination.lat},${destination.lon}`;
    
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.routes.length) {
        // Simple decode for MVP (Just start and end points if no decoder lib)
        const points = [
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: destination.lat, longitude: destination.lon }
        ];
        // If you install @mapbox/polyline later, decode data.routes[0].overview_polyline.points here
        
        setRouteCoords(points);
        setTravelTime(data.routes[0].legs[0].duration.text);
      }
    } catch (error) {
      console.log("Direction Error", error);
    }
  };

  const onMarkerPress = (poi) => {
    setSelectedPoi(poi);
    setTravelTime(null);
    setRouteCoords([]);
    getRoutePreview(poi);
  };

  const handleNavigate = () => {
    if (!location || !selectedPoi) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${selectedPoi.lat},${selectedPoi.lon}&travelmode=driving`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        showsUserLocation={true}
        initialRegion={{
          latitude: 33.8938, longitude: 35.5018,
          latitudeDelta: 0.1, longitudeDelta: 0.1,
        }}
      >
        {pois.map((poi, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: poi.lat, longitude: poi.lon }}
            title={poi.name}
            pinColor={poi.friction_index < 0.6 ? 'red' : 'green'}
            onPress={() => onMarkerPress(poi)}
          />
        ))}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#4285F4" />}
      </MapView>

      {selectedPoi && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedPoi.name}</Text>
          {travelTime && <Text style={styles.timeText}>⏱️ {travelTime} drive</Text>}
          <Text style={styles.desc}>{selectedPoi.xai_explanation}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
            <Text style={styles.navText}>Open in Google Maps</Text>
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