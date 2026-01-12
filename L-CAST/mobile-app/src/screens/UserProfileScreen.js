import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, RefreshControl, 
  ScrollView, Image, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); 
  const BASE_URL = api.defaults.baseURL;

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    setRefreshing(true);
    try {
      // 1. Profile Details (Stats & Bio)
      const res = await api.get(`/api/social/user/${userId}/profile`);
      setProfile(res.data);
      setIsFollowing(res.data.is_following);

      // 2. User's Posts (Independent try/catch)
      try {
        const postsRes = await api.get(`/api/social/user/${userId}/posts`);
        setUserPosts(postsRes.data);
      } catch (e) { console.error("Posts Fetch Error:", e.message); }

      // 3. User's Saved Places (Using your itineraries logic)
      try {
        const savedRes = await api.get(`/api/social/user/${userId}/saved-places`);
        setSavedPlaces(savedRes.data);
      } catch (e) { console.error("Saved Places Fetch Error:", e.message); }

    } catch (e) {
      console.error("Critical Profile Load Error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        await api.delete(`/api/social/user/${userId}/unfollow`);
      } else {
        await api.post(`/api/social/user/${userId}/follow`);
      }
      setIsFollowing(!isFollowing);
      // Refresh to update follower counts
      const res = await api.get(`/api/social/user/${userId}/profile`);
      setProfile(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLike = async (postId) => {
    setUserPosts(curr => curr.map(p => {
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

  if (!profile) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerUsername}>@{profile.username}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadUserProfile} />}
        stickyHeaderIndices={[2]}
      >
        {/* 0: PROFILE HEADER STATS */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.username[0].toUpperCase()}</Text>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('UserList', { userId, type: 'Followers' })}>
              <Text style={styles.statNumber}>{profile.followersCount || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('UserList', { userId, type: 'Following' })}>
              <Text style={styles.statNumber}>{profile.followingCount || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1: BIO & ACTION BUTTON */}
        <View style={styles.bioSection}>
            <View style={styles.bioHeader}>
                <Text style={styles.bioUsername}>{profile.username}</Text>
                <TouchableOpacity 
                    style={[styles.followBtn, isFollowing && styles.unfollowBtn]} 
                    onPress={handleFollowToggle}
                >
                    <Text style={[styles.followBtnText, isFollowing && styles.unfollowBtnText]}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.bioText}>{profile.bio || "No bio yet."}</Text>
        </View>

        {/* 2: TAB SWITCHER */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'posts' && styles.activeTab]} 
                onPress={() => setActiveTab('posts')}
            >
                <Ionicons name="apps-outline" size={22} color={activeTab === 'posts' ? '#007AFF' : '#888'} />
                <Text style={[styles.tabLabel, activeTab === 'posts' && {color: '#007AFF'}]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'saved' && styles.activeTab]} 
                onPress={() => setActiveTab('saved')}
            >
                <Ionicons name="bookmark-outline" size={22} color={activeTab === 'saved' ? '#007AFF' : '#888'} />
                <Text style={[styles.tabLabel, activeTab === 'saved' && {color: '#007AFF'}]}>Places</Text>
            </TouchableOpacity>
        </View>

        {/* 3: CONTENT LIST */}
        <View style={styles.contentList}>
            {activeTab === 'posts' ? (
                userPosts.length === 0 ? (
                    <Text style={styles.emptyText}>No posts yet.</Text>
                ) : (
                    userPosts.map(item => (
                        <View key={item.id} style={styles.feedCard}>
                            <View style={styles.feedCardHeader}>
                                <View style={styles.miniAvatar}><Text style={styles.miniAvatarText}>{profile.username[0].toUpperCase()}</Text></View>
                                <View>
                                    <Text style={styles.cardUser}>@{profile.username}</Text>
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
                    <Text style={styles.emptyText}>No saved places yet.</Text>
                ) : (
                    savedPlaces.map(item => (
                        <TouchableOpacity 
                          key={item.id} 
                          style={styles.savedCard}
                          onPress={() => navigation.navigate('POIDetails', { poi: item })}
                        >
                            <View style={styles.savedInfo}>
                                <View style={styles.locationIcon}><Ionicons name="location" size={20} color="white" /></View>
                                <View style={{marginLeft: 12}}>
                                    <Text style={styles.savedName}>{item.name}</Text>
                                    <Text style={styles.savedRegion}>{item.region || item.category}</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#ccc" />
                        </TouchableOpacity>
                    ))
                )
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff' },
  headerUsername: { fontSize: 18, fontWeight: 'bold', color: '#333' },
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
  followBtn: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 6, borderRadius: 15 },
  unfollowBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  unfollowBtnText: { color: '#333' },
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
});