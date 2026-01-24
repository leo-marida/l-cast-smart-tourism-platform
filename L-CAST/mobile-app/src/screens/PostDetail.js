import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  StyleSheet, Image, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

export default function PostDetail({ route }) {
  const { post } = route.params; 
  const navigation = useNavigation();

  // States
  const [localPost, setLocalPost] = useState(post);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const BASE_URL = api.defaults.baseURL;

  const fetchData = async () => {
    try {
      // 1. Fetch current user to check ownership
      const userRes = await api.get('/api/social/user/me/profile');
      setCurrentUserId(userRes.data.id);

      // 2. Fetch comments
      const commentRes = await api.get(`/api/social/post/${post.id}/comments`);
      setComments(commentRes.data);
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  const handlePostOptions = () => {
    Alert.alert(
      "Post Options",
      "Manage your post",
      [
        { text: "Edit", onPress: () => setIsEditing(true) },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: confirmDelete 
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/social/post/${localPost.id}`);
      navigation.goBack(); // Return to feed after deletion
    } catch (err) {
      Alert.alert("Error", "Could not delete post.");
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await api.put(`/api/social/post/${localPost.id}`, { content: editContent });
      setLocalPost({ ...localPost, content: res.data.content });
      setIsEditing(false);
    } catch (err) {
      Alert.alert("Error", "Could not update post.");
    }
  };

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
            <View style={styles.headerRow}>
              <Text style={styles.username}>@{localPost.username}</Text>
              
              {/* Show options only if I own the post */}
              {currentUserId === localPost.user_id && !isEditing && (
                <TouchableOpacity onPress={handlePostOptions}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {isEditing ? (
              <View style={styles.editModeContainer}>
                <TextInput
                  style={styles.editInput}
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  autoFocus
                />
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveEdit} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.content}>{localPost.content}</Text>
            )}

            {localPost.image_url && (
              <Image source={{ uri: `${BASE_URL}${localPost.image_url}` }} style={styles.postImage} />
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  username: { fontWeight: 'bold', fontSize: 16 },
  content: { fontSize: 16, marginBottom: 10, color: '#333' },
  
  // Edit Mode Styles
  editModeContainer: { marginBottom: 15 },
  editInput: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#ddd', textAlignVertical: 'top', minHeight: 80 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 },
  cancelText: { color: 'red', marginRight: 20, fontWeight: '600' },
  saveButton: { backgroundColor: '#007AFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
  saveButtonText: { color: 'white', fontWeight: 'bold' },

  postImage: { width: '100%', height: 250, borderRadius: 10, marginTop: 10 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  commentTitle: { fontWeight: 'bold', color: '#666', marginBottom: 5 },
  commentCard: { paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  commentUser: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  commentText: { fontSize: 14, color: '#555', marginTop: 2 },
  inputContainer: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center', backgroundColor: 'white' },
  input: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10 }
});