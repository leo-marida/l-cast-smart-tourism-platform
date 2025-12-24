import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../services/api';

export default function HomeScreen() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscovery();
  }, []);

  const fetchDiscovery = async () => {
    try {
      // Sending Beirut coordinates as example
      const res = await api.get('/api/discover?lat=33.8938&lon=35.5018');
      setRecommendations(res.data.data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const renderPOI = ({ item }) => (
    <View style={[styles.card, item.mu_applied < 0.7 && styles.warningCard]}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.score}>{Math.round(item.final_score * 100)}% Match</Text>
      </View>
      
      <Text style={styles.explanation}>{item.xai_explanation}</Text>
      
      {item.mu_applied < 1.0 && (
        <View style={styles.frictionBadge}>
          <Text style={styles.frictionText}>⚠️ Caution: {item.safety_reasons.join(', ')}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.checkInBtn} 
        onPress={() => alert("Safety Verified!")}
      >
        <Text style={{color: 'white', fontWeight: 'bold'}}>Verify Safety Here</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" style={{flex: 1}} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommended for You</Text>
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.poi_id.toString()}
        renderItem={renderPOI}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
  warningCard: { borderColor: '#e74c3c', borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 18, fontWeight: 'bold' },
  score: { color: '#27ae60', fontWeight: 'bold' },
  explanation: { marginTop: 5, color: '#666', fontSize: 14 },
  frictionBadge: { backgroundColor: '#fff3cd', padding: 5, borderRadius: 5, marginTop: 10 },
  frictionText: { color: '#856404', fontSize: 12 },
  checkInBtn: { backgroundColor: '#3498db', marginTop: 10, padding: 10, borderRadius: 8, alignItems: 'center'}
});