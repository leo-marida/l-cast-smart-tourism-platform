import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, RefreshControl, 
  ScrollView, Alert, Image, Modal, TextInput, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('User');
  const [bio, setBio] = useState('Adventure awaits. Sharing my favorite spots! ✨');
  const [myPosts, setMyPosts] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); 

  // Edit Bio States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [tempBio, setTempBio] = useState('');

  const [currentUserId, setCurrentUserId] = useState(null);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const BASE_URL = api.defaults.baseURL;

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      setShowMenu(false);
    }, [])
  );

  const loadProfile = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch own profile data (now includes bio from DB)
      const meRes = await api.get('/api/social/user/me/profile');
      const myId = meRes.data.id;
      setCurrentUserId(myId);
      setUsername(meRes.data.username);
      
      // If bio exists in DB, use it; otherwise use default
      if (meRes.data.bio) {
        setBio(meRes.data.bio);
      }

      // 2. Fetch stats (followers/following)
      const profileRes = await api.get(`/api/social/user/${myId}/profile`);
      setStats({
        followers: profileRes.data.followersCount || 0,
        following: profileRes.data.followingCount || 0
      });

      // 3. Fetch feed and filter for user's posts
      const feedRes = await api.get('/api/social/feed');
      const filteredPosts = feedRes.data
        .filter(p => p.user_id === myId)
        .map(p => ({ ...p, isLiked: p.is_liked || false }));
      setMyPosts(filteredPosts);

      // 4. Fetch saved places
      const savedRes = await api.get('/api/pois/saved');
      setSavedPlaces(savedRes.data);

    } catch (e) {
      console.log("Profile Load Error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateBio = async () => {
    if (!tempBio.trim()) {
        Alert.alert("Error", "Bio cannot be empty.");
        return;
    }

    setIsSavingBio(true);
    try {
      // Sends PATCH request to socialRoutes.js
      await api.patch('/api/social/me/update', { bio: tempBio });
      
      setBio(tempBio);
      setIsEditModalVisible(false);
      Alert.alert("Success", "Profile bio updated!");
    } catch (err) {
      console.error("Update Bio Error:", err);
      Alert.alert("Error", "Could not save bio to database. Please try again.");
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleLike = async (postId) => {
    setMyPosts(curr => curr.map(p => {
      if (p.id === postId) {
        const newState = !p.isLiked;
        return { 
            ...p, 
            isLiked: newState, 
            likes_count: newState ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 1) - 1) 
        };
      }
      return p;
    }));
    try { await api.post(`/api/social/post/${postId}/like`); } catch(err) { }
  };

  const handleUnsave = async (poiId) => {
    try {
        await api.post('/api/pois/unsave', { poi_id: poiId });
        setSavedPlaces(prev => prev.filter(p => p.id !== poiId));
    } catch (err) {
        Alert.alert("Error", "Could not remove.");
    }
  };

  const performLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerUsername}>{username}</Text>
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
            <Ionicons name="menu-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      {/* MENU POPUP */}
      {showMenu && (
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={styles.menuBox}>
                <TouchableOpacity onPress={performLogout} style={styles.menuItem}>
                    <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                    <Text style={styles.menuText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      )}

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadProfile} />}
        stickyHeaderIndices={[2]} 
      >
        {/* 0: PROFILE HEADER */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{username ? username[0].toUpperCase() : 'U'}</Text>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => currentUserId && navigation.navigate('UserList', { userId: currentUserId, type: 'Followers' })}>
              <Text style={styles.statNumber}>{stats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => currentUserId && navigation.navigate('UserList', { userId: currentUserId, type: 'Following' })}>
              <Text style={styles.statNumber}>{stats.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1: BIO SECTION WITH EDIT */}
        <View style={styles.bioSection}>
            <View style={styles.bioHeader}>
                <Text style={styles.bioUsername}>@{username}</Text>
                <TouchableOpacity 
                    style={styles.editBtn} 
                    onPress={() => { setTempBio(bio); setIsEditModalVisible(true); }}
                >
                    <Text style={styles.editBtnText}>Edit Bio</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.bioText}>{bio}</Text>
        </View>

        {/* 2: TAB SWITCHER */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'posts' && styles.activeTab]} 
                onPress={() => setActiveTab('posts')}
            >
                <Ionicons name="apps-outline" size={22} color={activeTab === 'posts' ? '#007AFF' : '#888'} />
                <Text style={[styles.tabLabel, activeTab === 'posts' && {color: '#007AFF'}]}>My Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'saved' && styles.activeTab]} 
                onPress={() => setActiveTab('saved')}
            >
                <Ionicons name="bookmark-outline" size={22} color={activeTab === 'saved' ? '#007AFF' : '#888'} />
                <Text style={[styles.tabLabel, activeTab === 'saved' && {color: '#007AFF'}]}>Saved</Text>
            </TouchableOpacity>
        </View>

        {/* 3: CONTENT LIST */}
        <View style={styles.contentList}>
            {activeTab === 'posts' ? (
                myPosts.length === 0 ? (
                    <Text style={styles.emptyText}>You haven't posted anything yet.</Text>
                ) : (
                    myPosts.map(item => (
                        <View key={item.id} style={styles.feedCard}>
                            <View style={styles.feedCardHeader}>
                                <View style={styles.miniAvatar}><Text style={styles.miniAvatarText}>{username[0].toUpperCase()}</Text></View>
                                <View>
                                    <Text style={styles.cardUser}>@{username}</Text>
                                    <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                </View>
                            </View>
                            
                            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('PostDetail', { post: item })}>
                                <Text style={styles.cardContent}>{item.content}</Text>
                                {item.image_url && (
                                    <Image source={{ uri: `${BASE_URL}${item.image_url}` }} style={styles.cardImage} resizeMode="cover" />
                                )}
                            </TouchableOpacity>

                            <View style={styles.cardActions}>
                                <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.actionBtn}>
                                    <Ionicons name={item.isLiked ? "heart" : "heart-outline"} size={22} color={item.isLiked ? "#e74c3c" : "#666"} />
                                    <Text style={styles.actionCount}>{item.likes_count || 0}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { post: item })} style={styles.actionBtn}>
                                    <Ionicons name="chatbubble-outline" size={20} color="#666" />
                                    <Text style={styles.actionCount}>{item.comment_count || 0}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )
            ) : (
                savedPlaces.length === 0 ? (
                    <Text style={styles.emptyText}>No places saved in your wishlist.</Text>
                ) : (
                    savedPlaces.map(item => (
                        <View key={item.id} style={styles.savedCard}>
                            <View style={styles.savedInfo}>
                                <View style={styles.locationIcon}><Ionicons name="location" size={20} color="white" /></View>
                                <View style={{marginLeft: 12}}>
                                    <Text style={styles.savedName}>{item.name}</Text>
                                    <Text style={styles.savedRegion}>{item.region}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => handleUnsave(item.id)} style={styles.unsaveBtn}>
                                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                            </TouchableOpacity>
                        </View>
                    ))
                )
            )}
        </View>
      </ScrollView>

      {/* EDIT BIO MODAL */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Update Bio</Text>
                <TextInput 
                    style={styles.bioInput}
                    multiline
                    numberOfLines={4}
                    value={tempBio}
                    onChangeText={setTempBio}
                    placeholder="Tell the community about yourself..."
                    maxLength={150}
                />
                <View style={styles.modalButtons}>
                    <TouchableOpacity 
                        onPress={() => setIsEditModalVisible(false)} 
                        style={styles.cancelBtn}
                        disabled={isSavingBio}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={handleUpdateBio} 
                        style={styles.saveBtn}
                        disabled={isSavingBio}
                    >
                        {isSavingBio ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff' },
  headerUsername: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  menuBox: { position: 'absolute', top: 50, right: 20, backgroundColor: 'white', borderRadius: 12, elevation: 5, padding: 5, minWidth: 160 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { marginLeft: 10, fontSize: 16, color: '#e74c3c', fontWeight: 'bold' },

  profileHeader: { flexDirection: 'row', padding: 20, backgroundColor: '#fff', alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', marginLeft: 10 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 13, color: '#666' },

  bioSection: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff' },
  bioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  bioUsername: { fontWeight: 'bold', fontSize: 16 },
  bioText: { color: '#444', fontSize: 14, lineHeight: 20 },
  editBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15, borderWidth: 1, borderColor: '#ddd' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#555' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabLabel: { marginLeft: 8, fontWeight: '600', color: '#888', fontSize: 14 },

  contentList: { paddingVertical: 10 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontStyle: 'italic' },

  feedCard: { backgroundColor: '#fff', marginBottom: 10, padding: 15 },
  feedCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  miniAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  miniAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cardUser: { fontWeight: 'bold', fontSize: 15 },
  cardDate: { fontSize: 12, color: '#999' },
  cardContent: { fontSize: 16, lineHeight: 22, color: '#333', marginBottom: 10 },
  cardImage: { width: '100%', height: 250, borderRadius: 10, marginBottom: 10 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 25 },
  actionCount: { marginLeft: 6, color: '#666', fontWeight: '500' },

  savedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, marginBottom: 1, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  savedInfo: { flexDirection: 'row', alignItems: 'center' },
  locationIcon: { backgroundColor: '#007AFF', padding: 8, borderRadius: 20 },
  savedName: { fontWeight: 'bold', fontSize: 16 },
  savedRegion: { color: '#777', fontSize: 12 },
  unsaveBtn: { padding: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', borderRadius: 20, padding: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  bioInput: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12, textAlignVertical: 'top', height: 100, borderWidth: 1, borderColor: '#eee' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#007AFF', padding: 12, borderRadius: 10, alignItems: 'center', minHeight: 45, justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});