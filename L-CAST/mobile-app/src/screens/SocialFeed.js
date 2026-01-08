import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [followingIds, setFollowingIds] = useState([]); 
  const [currentUserId, setCurrentUserId] = useState(null);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/api/social/feed');
      
      const formatted = res.data.map(p => ({
        ...p,
        isLiked: p.is_liked || false 
      }));
      setPosts(formatted);

      // 1. Find who YOU are (if the backend includes a post by you)
      // or we can get this from a dedicated profile call later.
      const idsFromServer = res.data
        .filter(p => p.is_following === true)
        .map(p => p.user_id);
      
      setFollowingIds([...new Set(idsFromServer)]);

      // 2. Set your current ID so we can hide the follow button on your posts
      // Note: This assumes you've made at least one post. 
      // If not, we'll fix this properly in the Profile step!
    } catch (err) { 
      console.error("Fetch posts failed", err); 
    }
  };

  // NEW: Let's fetch your actual profile ID properly
  const fetchMyProfile = async () => {
    try {
      // Calling a special "me" endpoint or your profile
      // For now, let's use the ID from your token (handled by backend)
      const res = await api.get('/api/social/user/me/profile'); 
      setCurrentUserId(res.data.id);
    } catch (err) {
      console.log("Could not fetch my ID yet");
    }
  };

  const handleFollow = async (userId) => {
    if (!userId) return;
    const isCurrentlyFollowing = followingIds.includes(userId);
    try {
      if (isCurrentlyFollowing) {
        await api.delete(`/api/social/user/${userId}/unfollow`);
        setFollowingIds(prev => prev.filter(id => id !== userId));
      } else {
        await api.post(`/api/social/user/${userId}/follow`);
        setFollowingIds(prev => [...prev, userId]);
      }
    } catch (err) {
      Alert.alert("Error", "Could not update follow status.");
    }
  };

  const handlePost = async () => {
    if (!newPost) return;
    try {
      await api.post('/api/social/post', { content: newPost });
      setNewPost('');
      fetchPosts(); 
    } catch(err) { console.error("Post failed", err); }
  };

  const handleLike = async (postId) => {
    setPosts(currentPosts => 
      currentPosts.map(p => {
        if (p.id === postId) {
          const newState = !p.isLiked;
          return { 
            ...p, 
            isLiked: newState, 
            likes_count: newState ? (p.likes_count || 0) + 1 : (p.likes_count || 1) - 1 
          };
        }
        return p;
      })
    );
    try { await api.post(`/api/social/post/${postId}/like`); } catch(err) { }
  };

  useEffect(() => { 
    fetchPosts();
    fetchMyProfile();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Community Pulse</Text>
      
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Share a safety update..." 
          value={newPost}
          onChangeText={setNewPost}
        />
        <TouchableOpacity onPress={handlePost} style={styles.postButton}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isFollowing = followingIds.includes(item.user_id);
          const isMe = item.user_id === currentUserId; 

          return (
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>@{item.username}</Text>
                  
                  {/* Hides button if it's your post OR if we don't know who you are yet */}
                  {!isMe && currentUserId && (
                    <TouchableOpacity 
                      onPress={() => handleFollow(item.user_id)}
                      style={[styles.followButton, isFollowing && styles.followingButton]}
                    >
                      <Text style={[styles.followText, isFollowing && styles.followingText]}>
                        {isFollowing ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>

              {/* RE-ADDED THE MISSING CONTENT CODE BELOW */}
              <Text style={styles.content}>{item.content}</Text>
              
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.row}>
                  <Ionicons 
                    name={item.isLiked ? "heart" : "heart-outline"} 
                    size={20} 
                    color={item.isLiked ? "red" : "gray"} 
                  />
                  <Text style={styles.actionText}>{item.likes_count || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 10 },
  headerTitle: { fontSize: 22, fontWeight:'bold', marginVertical: 10, marginLeft: 5 },
  inputContainer: { flexDirection: 'row', marginBottom: 15, alignItems:'center' },
  input: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 20, elevation: 1 },
  postButton: { backgroundColor: '#007AFF', padding: 10, borderRadius: 20, marginLeft: 10 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  username: { fontWeight: 'bold', color: '#333' },
  date: { color: 'gray', fontSize: 12 },
  content: { fontSize: 15, marginVertical: 5 },
  actions: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 5, color: '#666' },
  followButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  followingButton: {
    backgroundColor: '#EFEFEF',
    borderWidth: 1,
    borderColor: '#CCC'
  },
  followText: { color: 'white', fontSize: 12, fontWeight: '700' },
  followingText: { color: '#333' }
});