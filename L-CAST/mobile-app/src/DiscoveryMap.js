import React from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';
import { StyleSheet, View, Text } from 'react-native';

export default function DiscoveryMap({ locations }) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 33.8938, // Beirut
          longitude: 35.5018,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        }}
      >
        {locations.map((poi) => (
          <React.Fragment key={poi.poi_id}>
            {/* The Visual "Wow": A Safety Radius around each POI */}
            <Circle
              center={{ latitude: poi.lat, longitude: poi.lon }}
              radius={3000}
              fillColor={poi.mu_applied > 0.8 ? "rgba(0, 255, 0, 0.2)" : "rgba(255, 0, 0, 0.2)"}
              strokeColor={poi.mu_applied > 0.8 ? "#2ecc71" : "#e74c3c"}
            />
            <Marker
              coordinate={{ latitude: poi.lat, longitude: poi.lon }}
              title={poi.name}
              description={poi.xai_explanation}
            />
          </React.Fragment>
        ))}
      </MapView>
      
      {/* Real-time Friction Alert Overlay */}
      <View style={styles.alertBox}>
        <Text style={styles.alertText}>L-CAST Engine: Live Safety Sync Active 🛰️</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  map: { ...StyleSheet.absoluteFillObject },
  alertBox: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 20,
  },
  alertText: { color: 'white', fontWeight: 'bold' }
});