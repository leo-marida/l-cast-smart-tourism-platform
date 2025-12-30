import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, Alert, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('User');
  const [myPosts, setMyPosts] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // New State for Menu
  const [showMenu, setShowMenu] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      // Close menu when screen gains focus
      setShowMenu(false);
    }, [])
  );

  const loadProfile = async () => {
    setRefreshing(true);
    try {
      const storedName = await AsyncStorage.getItem('username');
      if (storedName) setUsername(storedName);

      const feedRes = await api.get('/api/social/feed');
      const filteredPosts = feedRes.data.filter(p => p.username === storedName);
      setMyPosts(filteredPosts);

      const savedRes = await api.get('/api/pois/saved');
      setSavedPlaces(savedRes.data);

    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUnsave = async (poiId) => {
    try {
        await api.post('/api/pois/unsave', { poi_id: poiId });
        setSavedPlaces(prev => prev.filter(p => p.id !== poiId));
    } catch (err) {
        Alert.alert("Error", "Could not remove.");
    }
  };

  const confirmLogout = () => {
    setShowMenu(false); // Close menu first
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: performLogout 
        }
      ]
    );
  };

  const performLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* --- TOP HEADER WITH 3 DOTS --- */}
      <View style={styles.headerContainer}>
        <View style={{flex:1}} /> 
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={{padding: 5}}>
            <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* --- MENU POPUP (Absolute Positioned) --- */}
      {showMenu && (
        <TouchableOpacity 
            style={styles.menuOverlay} 
            activeOpacity={1} 
            onPress={() => setShowMenu(false)}
        >
            <View style={styles.menuBox}>
                <TouchableOpacity onPress={confirmLogout} style={styles.menuItem}>
                    <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                    <Text style={styles.menuText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      )}

      <ScrollView 
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadProfile} />}
      >
        {/* AVATAR */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{username ? username[0].toUpperCase() : 'U'}</Text>
        </View>
        <Text style={styles.name}>@{username}</Text>

        {/* SECTION 1: MY POSTS */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Activity</Text>
            {myPosts.length === 0 ? (
                <Text style={styles.emptyText}>No posts yet.</Text>
            ) : (
                myPosts.map(post => (
                    <View key={post.id} style={styles.postCard}>
                        <Text style={styles.postContent}>{post.content}</Text>
                        <Text style={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</Text>
                    </View>
                ))
            )}
        </View>

        {/* SECTION 2: MY WISHLIST */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Wishlist</Text>
            {savedPlaces.length === 0 ? (
                <Text style={styles.emptyText}>No places saved yet.</Text>
            ) : (
                savedPlaces.map(item => (
                    <View key={item.id} style={styles.savedCard}>
                        <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                            <Ionicons name="location-sharp" size={24} color="#007AFF" />
                            <View style={{marginLeft: 15}}>
                                <Text style={styles.savedName}>{item.name}</Text>
                                <Text style={styles.savedRegion}>{item.region}</Text>
                            </View>
                        </View>
                        {/* REMOVE BUTTON */}
                        <TouchableOpacity onPress={() => handleUnsave(item.id)}>
                            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  // Header & Menu Styles
  headerContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, zIndex: 10 },
  menuOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 20 },
  menuBox: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    backgroundColor: 'white', 
    borderRadius: 8, 
    padding: 5, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 5,
    minWidth: 150
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { marginLeft: 10, fontSize: 16, color: '#e74c3c', fontWeight: '500' },

  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 30 },
  
  section: { width: '90%', marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color:'#333' },
  emptyText: { color: 'gray', fontStyle: 'italic' },

  postCard: { backgroundColor: '#f0f2f5', padding: 15, borderRadius: 10, marginBottom: 10 },
  postContent: { fontSize: 15, color: '#333' },
  postDate: { fontSize: 11, color: 'gray', marginTop: 5, textAlign: 'right' },

  savedCard: { flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  savedName: { fontWeight: 'bold', fontSize: 16 },
  savedRegion: { color: 'gray', fontSize: 12 },
});