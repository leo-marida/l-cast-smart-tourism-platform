import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await api.get('/api/social/feed');
      setPosts(res.data);
    } catch (err) { console.error(err); }
  };

  const handlePost = async () => {
    if (!newPost) return;
    await api.post('/api/social/post', { content: newPost });
    setNewPost('');
    fetchPosts();
  };

  const handleLike = async (postId) => {
    await api.post(`/api/social/post/${postId}/like`);
    fetchPosts();
  };

  useEffect(() => { fetchPosts(); }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Share your trip..." 
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
                <Ionicons name="heart-outline" size={20} color="red" />
                <Text style={styles.actionText}>{item.likes_count}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  inputContainer: { flexDirection: 'row', marginBottom: 15 },
  input: { flex: 1, backgroundColor: 'white', padding: 10, borderRadius: 20 },
  postButton: { backgroundColor: '#007AFF', padding: 10, borderRadius: 20, marginLeft: 10, justifyContent:'center' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10 },
  username: { fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 5 }
});