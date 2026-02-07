import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  StyleSheet, Image, Platform, Alert, Keyboard, Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

// Adjust this number to increase or decrease the gap above the keyboard
const KEYBOARD_EXTRA_GAP = 15; 

export default function PostDetail({ route }) {
  const { post } = route.params; 
  const navigation = useNavigation();

  // --- STATES ---
  const [localPost, setLocalPost] = useState(post);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const BASE_URL = api.defaults.baseURL;

  // --- DYNAMIC KEYBOARD ANIMATION ---
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        duration: e.duration || 250,
        // We add the extra gap here
        toValue: e.endCoordinates.height + KEYBOARD_EXTRA_GAP, 
        useNativeDriver: false,
      }).start();
    });

    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        duration: e.duration || 250,
        toValue: 0,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    try {
      const userRes = await api.get('/api/social/user/me/profile');
      setCurrentUserId(userRes.data.id);
      const commentRes = await api.get(`/api/social/post/${post.id}/comments`);
      setComments(commentRes.data);
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- HANDLERS ---
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/api/social/post/${post.id}/comment`, { content: newComment });
      setComments([...comments, res.data]);
      setNewComment('');
      Keyboard.dismiss();
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
        { text: "Delete", style: "destructive", onPress: confirmDelete },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/social/post/${localPost.id}`);
      navigation.goBack();
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
    <View style={styles.mainContainer}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View style={styles.postContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.username}>@{localPost.username}</Text>
              {currentUserId === localPost.user_id && !isEditing && (
                <TouchableOpacity onPress={handlePostOptions} style={{ padding: 5 }}>
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
                    <Text style={styles.saveButtonText}>Save</Text>
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

      {/* DYNAMIC FOOTER with EXTRA GAP */}
      <Animated.View style={{ marginBottom: keyboardHeight }}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity onPress={handleAddComment} style={styles.sendBtn}>
            <Ionicons name="send" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: 'white' },
  postContainer: { padding: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  username: { fontWeight: 'bold', fontSize: 16 },
  content: { fontSize: 16, marginBottom: 10, color: '#333' },
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
  inputContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
    alignItems: 'center', 
    backgroundColor: 'white',
    // Bottom padding for when the keyboard is CLOSED
    paddingBottom: Platform.OS === 'ios' ? 25 : 10 
  },
  input: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, fontSize: 15 },
  sendBtn: { padding: 4 }
});