import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, Image, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
// Use your key here
import { GOOGLE_MAPS_API_KEY } from '@env'; 

const { width } = Dimensions.get('window');

export default function DiscoveryMap({ route, navigation }) {
  const [userLocation, setUserLocation] = useState(null);
  const [pois, setPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [travelTime, setTravelTime] = useState(null);
  const [travelDistance, setTravelDistance] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // --- HELPER: Aggressive Coordinate Parser ---
  const getLatLon = (item) => {
    if (!item) return { lat: 33.8938, lon: 35.5018 }; // Default Beirut
    
    // 1. Backend sends 'lat' and 'lon' as numbers or strings
    if (item.lat !== undefined && item.lon !== undefined) {
        return { lat: parseFloat(item.lat), lon: parseFloat(item.lon) };
    }
    // 2. PostGIS GeoJSON format
    if (item.location?.coordinates) {
        return { lat: item.location.coordinates[1], lon: item.location.coordinates[0] };
    }
    // 3. Google Maps format fallback
    if (item.latitude && item.longitude) {
        return { lat: parseFloat(item.latitude), lon: parseFloat(item.longitude) };
    }

    return { lat: 33.8938, lon: 35.5018 }; 
  };

  // 1. Get User Location on Mount
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation(loc.coords);
        
        // Fetch surrounding POIs once we have location
        fetchPois(loc.coords.latitude, loc.coords.longitude);
      } catch (e) {
        console.log("Location Error:", e);
      }
    })();
  }, []);

  // 2. LISTEN for Params AND User Location
  // Only trigger the route calculation when WE HAVE BOTH the target AND the user's location
  useEffect(() => {
    if (route.params?.targetPoi && userLocation) {
      const target = route.params.targetPoi;
      // Trigger selection logic
      setSelectedPoi(target);
      getRoutePreview(target, userLocation);
    }
  }, [route.params, userLocation]); // <--- Dependency array fixes the Race Condition

  const fetchPois = async (lat, lon) => {
    try {
      const res = await api.get(`/api/pois/discover?lat=${lat}&lon=${lon}`);
      let data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      // Sort by Safety
      data.sort((a, b) => (b.friction_index || 0) - (a.friction_index || 0));
      setPois(data);
    } catch (err) {
      console.log("Map Fetch Error:", err);
    }
  };

  const getRoutePreview = async (destination, originLoc) => {
    if (!originLoc || !destination) return;
    
    // Reset previous route info
    setTravelTime(null);
    setTravelDistance(null);
    setRouteCoords([]);

    if (!GOOGLE_MAPS_API_KEY) {
        console.warn("No Google Maps API Key");
        return;
    }

    const { lat: destLat, lon: destLon } = getLatLon(destination);
    const origin = `${originLoc.latitude},${originLoc.longitude}`;
    const dest = `${destLat},${destLon}`;

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.routes && data.routes.length > 0) {
        const leg = data.routes[0].legs[0];
        setTravelTime(leg.duration.text); 
        setTravelDistance(leg.distance.text); 
        
        // Draw simple line
        setRouteCoords([
            { latitude: originLoc.latitude, longitude: originLoc.longitude },
            { latitude: destLat, longitude: destLon }
        ]);
      }
    } catch (error) {
      console.log("Direction API Error", error);
    }
  };

  const onMarkerPress = (poi) => {
    setSelectedPoi(poi);
    // Use current userLocation state
    if (userLocation) {
        getRoutePreview(poi, userLocation);
    }
  };

  const handleNavigate = () => {
    if (!userLocation || !selectedPoi) return;
    const { lat: destLat, lon: destLon } = getLatLon(selectedPoi);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${destLat},${destLon}&travelmode=driving`;
    Linking.openURL(url);
  };

  const handleClose = () => {
    setSelectedPoi(null);
    setRouteCoords([]);
  };

  const { lat: regionLat, lon: regionLon } = selectedPoi 
     ? getLatLon(selectedPoi) 
     : (userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : { lat: 33.8938, lon: 35.5018 });

  // --- IMAGE LOGIC ---
  const getGalleryImages = (poi) => {
    const images = [];
    if (poi.image_url && poi.image_url.startsWith('http')) {
        images.push(poi.image_url);
    } else {
        // Fallback for visual testing if DB is empty
        images.push('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Pigeon_Rocks_of_Beirut%2C_Rock_of_Raouche%2C_Beirut%2C_Lebanon.jpg/800px-Pigeon_Rocks_of_Beirut%2C_Rock_of_Raouche%2C_Beirut%2C_Lebanon.jpg');
    }
    return images;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <MapView 
        style={styles.map} 
        showsUserLocation={true}
        onMapReady={() => setIsMapReady(true)}
        region={{
          latitude: regionLat,
          longitude: regionLon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {isMapReady && pois.map((poi, index) => {
           const { lat, lon } = getLatLon(poi);
           const isSelected = selectedPoi && selectedPoi.id === poi.id;
           let pinColor = 'green';
           if (poi.friction_index < 0.8) pinColor = 'orange';
           if (poi.friction_index < 0.5) pinColor = 'red';
           if (isSelected) pinColor = 'blue';

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
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#4285F4" />}
      </MapView>

      {/* --- DETAILS CARD --- */}
      {selectedPoi && (
        <View style={styles.card}>
          <View style={styles.galleryContainer}>
             <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                 {getGalleryImages(selectedPoi).map((imgUrl, i) => (
                     <Image 
                        key={i}
                        source={{ uri: imgUrl }} 
                        style={styles.galleryImage}
                        resizeMode="cover"
                     />
                 ))}
             </ScrollView>
          </View>

          <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{selectedPoi.name}</Text>
                  <TouchableOpacity onPress={handleClose}>
                     <Ionicons name="close-circle" size={26} color="#999" />
                  </TouchableOpacity>
              </View>
              
              <Text style={styles.regionText}>{selectedPoi.region}</Text>
              
              <View style={[styles.badge, { backgroundColor: selectedPoi.friction_index < 0.8 ? '#f39c12' : '#27ae60' }]}>
                   <Text style={styles.badgeText}>Safety: {Math.round((selectedPoi.friction_index || 1) * 100)}%</Text>
              </View>

              {/* ROUTE INFO */}
              <View style={styles.metaRow}>
                  {travelTime ? (
                    <>
                        <Text style={styles.timeText}>⏱️ {travelTime}</Text>
                        <Text style={[styles.timeText, { marginLeft: 15 }]}>🚗 {travelDistance}</Text>
                    </>
                  ) : (
                    // Logic: If we have user location but no time yet, it's calculating. 
                    // If no user location, we are waiting for GPS.
                    <Text style={styles.loadingText}>
                        {userLocation ? "Calculating route..." : "Waiting for GPS..."}
                    </Text>
                  )}
              </View>
              
              <Text style={styles.desc} numberOfLines={3}>
                 {selectedPoi.description || "No description available."}
              </Text>
              
              <TouchableOpacity style={styles.navBtn} onPress={handleNavigate}>
                <Ionicons name="map" size={20} color="white" style={{marginRight: 8}} />
                <Text style={styles.navText}>Open in Google Maps</Text>
              </TouchableOpacity>
          </View>
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
      backgroundColor: 'white', borderRadius: 20, 
      elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
      overflow: 'hidden' 
  },
  
  galleryContainer: { height: 160, width: '100%', backgroundColor: '#eee' },
  galleryImage: { width: width - 40, height: 160 }, 

  cardContent: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', width: '90%' },
  regionText: { color: 'gray', marginBottom: 10 },
  
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  metaRow: { flexDirection: 'row', marginBottom: 10, height: 20 },
  timeText: { color: '#d35400', fontWeight: '600' },
  loadingText: { color: '#999', fontStyle: 'italic' },

  desc: { fontSize: 13, color: '#555', marginBottom: 15, lineHeight: 18 },
  
  navBtn: { 
      backgroundColor: '#4285F4', padding: 12, borderRadius: 12, 
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center' 
  },
  navText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});