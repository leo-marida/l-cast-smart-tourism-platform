import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [followingIds, setFollowingIds] = useState([]); // Track who we just followed in this session

  const fetchPosts = async () => {
    try {
      const res = await api.get('/api/social/feed');
      const formatted = res.data.map(p => ({
        ...p,
        isLiked: p.is_liked || p.isLiked || false 
      }));
      setPosts(formatted);
    } catch (err) { 
      console.error("Fetch posts failed", err); 
    }
  };

  const handleFollow = async (userId) => {
    try {
      await api.post(`/api/social/user/${userId}/follow`);
      
      // Update local state so the button changes immediately
      setFollowingIds(prev => [...prev, userId]);
      
      Alert.alert("Success", "You are now following this user.");
    } catch (err) {
      console.error("Follow failed", err);
      Alert.alert("Error", "Could not follow user.");
    }
  };

  const handlePost = async () => {
    if (!newPost) return;
    try {
      await api.post('/api/social/post', { content: newPost });
      setNewPost('');
      fetchPosts(); 
    } catch(err) { 
      console.error("Post failed", err); 
    }
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

    try {
      await api.post(`/api/social/post/${postId}/like`);
    } catch(err) { 
      console.log("Like API failed", err); 
    }
  };

  useEffect(() => { 
    fetchPosts(); 
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
          
          return (
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>@{item.username}</Text>
                  
                  {/* FOLLOW BUTTON */}
                  <TouchableOpacity 
                    onPress={() => handleFollow(item.user_id)}
                    disabled={isFollowing}
                    style={[styles.followButton, isFollowing && styles.followingButton]}
                  >
                    <Text style={[styles.followText, isFollowing && styles.followingText]}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>

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
  
  // New Styles for Follow Feature
  followButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 5,
  },
  followingButton: {
    backgroundColor: '#EFEFEF',
  },
  followText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  followingText: {
    color: '#333',
  }
});