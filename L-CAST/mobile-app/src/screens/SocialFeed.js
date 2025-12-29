import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await api.get('/api/social/feed');
      // Backend now returns 'is_liked' (snake_case) or 'isLiked' depending on your SQL adapter.
      // We map it to a clean boolean here to be safe.
      const formatted = res.data.map(p => ({
        ...p,
        isLiked: p.is_liked || p.isLiked || false // Handle both cases
      }));
      setPosts(formatted);
    } catch (err) { console.error(err); }
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
    // 1. Smart Toggle Logic (Immediate Red/Gray switch)
    setPosts(currentPosts => 
      currentPosts.map(p => {
        if (p.id === postId) {
          const newState = !p.isLiked;
          return { 
            ...p, 
            isLiked: newState, 
            likes_count: newState ? p.likes_count + 1 : p.likes_count - 1 
          };
        }
        return p;
      })
    );

    // 2. Send to Backend
    try {
      await api.post(`/api/social/post/${postId}/like`);
    } catch(err) { console.log("Like API failed"); }
  };

  useEffect(() => { fetchPosts(); }, []);

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
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.content}>{item.content}</Text>
            
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.row}>
                {/* CORRECT LOGIC: Using the mapped 'isLiked' property */}
                <Ionicons 
                  name={item.isLiked ? "heart" : "heart-outline"} 
                  size={20} 
                  color={item.isLiked ? "red" : "gray"} 
                />
                <Text style={styles.actionText}>{item.likes_count}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  username: { fontWeight: 'bold', color: '#333' },
  date: { color: 'gray', fontSize: 12 },
  content: { fontSize: 15, marginVertical: 5 },
  actions: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 5, color: '#666' }
});