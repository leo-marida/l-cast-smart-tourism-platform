import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function PostDetail({ route }) {
  const { post } = route.params; // Data passed from SocialFeed
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const BASE_URL = api.defaults.baseURL;

  const fetchComments = async () => {
    try {
      const res = await api.get(`/api/social/post/${post.id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error("Comment fetch failed", err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/api/social/post/${post.id}/comment`, { content: newComment });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      console.error("Failed to post comment");
    }
  };

  useEffect(() => { fetchComments(); }, []);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: 'white' }} 
      behavior={Platform.OS === "ios" ? "padding" : null}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={() => (
          <View style={styles.postContainer}>
            <Text style={styles.username}>@{post.username}</Text>
            <Text style={styles.content}>{post.content}</Text>
            {post.image_url && (
              <Image source={{ uri: `${BASE_URL}${post.image_url}` }} style={styles.postImage} />
            )}
            <View style={styles.divider} />
            <Text style={styles.commentTitle}>Comments ({comments.length})</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <Text style={styles.commentUser}>@{item.username}</Text>
            <Text style={styles.commentText}>{item.content}</Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Write a comment..."
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity onPress={handleAddComment}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  postContainer: { padding: 15 },
  username: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  content: { fontSize: 16, marginBottom: 10 },
  postImage: { width: '100%', height: 250, borderRadius: 10 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  commentTitle: { fontWeight: 'bold', color: '#666' },
  commentCard: { paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  commentUser: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  commentText: { fontSize: 14, color: '#555', marginTop: 2 },
  inputContainer: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10 }
});