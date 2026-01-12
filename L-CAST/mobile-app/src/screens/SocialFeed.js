import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  StyleSheet, Alert, Image, Animated, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); 
  const [followingIds, setFollowingIds] = useState([]); 
  const [currentUserId, setCurrentUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation();
  const BASE_URL = api.defaults.baseURL;

  // --- ANIMATION LOGIC ---
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerTranslate = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;

        if (currentY <= 0) {
          Animated.spring(headerTranslate, { toValue: 0, useNativeDriver: true }).start();
        } else if (diff > 5) {
          Animated.timing(headerTranslate, { toValue: -300, duration: 200, useNativeDriver: true }).start();
        } else if (diff < -5) {
          Animated.timing(headerTranslate, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
        lastScrollY.current = currentY;
      },
    }
  );

  const fetchPosts = async () => {
    try {
      const res = await api.get('/api/social/feed');
      // Ensure we treat the comment_count as a number right away
      setPosts(res.data.map(p => ({ 
        ...p, 
        isLiked: p.is_liked || false,
        comment_count: parseInt(p.comment_count) || 0 
      })));
      const idsFromServer = res.data.filter(p => p.is_following === true).map(p => p.user_id);
      setFollowingIds([...new Set(idsFromServer)]);
    } catch (err) { console.error(err); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const fetchMyProfile = async () => {
    try {
      const res = await api.get('/api/social/user/me/profile'); 
      setCurrentUserId(res.data.id);
    } catch (err) { console.log(err); }
  };

  // --- REFRESH ON FOCUS ---
  // This triggers when returning from PostDetail to update comment counts
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  useEffect(() => {
    fetchMyProfile();
  }, []);

  // --- NAVIGATION LOGIC ---
  const navigateToProfile = (targetUserId) => {
    if (targetUserId === currentUserId) {
      // If the post belongs to me, go to the main Profile tab
      navigation.navigate('Profile'); 
    } else {
      // If it belongs to someone else, go to the new UserProfile screen
      navigation.navigate('UserProfile', { userId: targetUserId });
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const handlePost = async () => {
    if (!newPost && !selectedImage) return;
    try {
      const formData = new FormData();
      formData.append('content', newPost);
      if (selectedImage) {
        const filename = selectedImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('image', { uri: selectedImage, name: filename, type });
      }
      await api.post('/api/social/post', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewPost(''); setSelectedImage(null); fetchPosts(); 
    } catch(err) { Alert.alert("Error", "Could not upload post."); }
  };

  const handleFollow = async (userId) => {
    const isCurrentlyFollowing = followingIds.includes(userId);
    setFollowingIds(prev => isCurrentlyFollowing ? prev.filter(id => id !== userId) : [...prev, userId]);
    try {
      if (isCurrentlyFollowing) await api.delete(`/api/social/user/${userId}/unfollow`);
      else await api.post(`/api/social/user/${userId}/follow`);
    } catch (err) { fetchPosts(); }
  };

  const handleLike = async (postId) => {
    setPosts(curr => curr.map(p => {
      if (p.id === postId) {
        const newState = !p.isLiked;
        return { ...p, isLiked: newState, likes_count: newState ? (p.likes_count || 0) + 1 : (p.likes_count || 1) - 1 };
      }
      return p;
    }));
    try { await api.post(`/api/social/post/${postId}/like`); } catch(err) { }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'white', zIndex: 11 }} />
      
      <Animated.View style={[styles.headerContainer, { transform: [{ translateY: headerTranslate }] }]}>
        {/* HEADER TOP ROW */}
        <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Community Pulse</Text>
            <TouchableOpacity 
                style={styles.notificationBtn} 
                onPress={() => navigation.navigate('Notifications')}
            >
                <Ionicons name="notifications-outline" size={26} color="#333" />
                {/* Red dot for unread status */}
                <View style={styles.unreadBadge} />
            </TouchableOpacity>
        </View>

        <View style={styles.createPostContainer}>
          <TextInput 
            style={styles.postInput} 
            placeholder="What's happening?" 
            multiline 
            value={newPost} 
            onChangeText={setNewPost} 
          />
          {selectedImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                <Ionicons name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.createPostActions}>
            <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
              <Ionicons name="image-outline" size={24} color="#007AFF" />
              <Text style={styles.iconText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePost} style={[styles.publishButton, (!newPost && !selectedImage) && styles.disabledButton]}>
              <Text style={styles.publishButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={posts}
        contentContainerStyle={{ paddingTop: 220, paddingBottom: 100 }} // Increased padding for the larger header
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={220} />
        }
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isFollowing = followingIds.includes(item.user_id);
          const isMe = item.user_id === currentUserId; 

          return (
            <View style={styles.card}>
              <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.userInfo} 
                    onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}
                >
                  <View style={styles.avatarPlaceholder}>
                     <Text style={styles.avatarLetter}>{item.username ? item.username[0].toUpperCase() : '?'}</Text>
                  </View>
                  <View>
                    <Text style={styles.username}>@{item.username}</Text>
                    <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>

                {!isMe && currentUserId && (
                  <TouchableOpacity onPress={() => handleFollow(item.user_id)} style={isFollowing ? styles.followingBadge : styles.followTextButton}>
                    <Text style={isFollowing ? styles.followingBadgeText : styles.followLinkText}>
                      {isFollowing ? "Following" : "+ Follow"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('PostDetail', { post: item })}>
                <Text style={styles.content}>{item.content}</Text>
                {item.image_url && (
                  <Image source={{ uri: `${BASE_URL}${item.image_url}` }} style={styles.postImage} resizeMode="cover" />
                )}
                
                {item.comment_count > 0 && (
                  <View style={styles.commentPreviewArea}>
                    {item.latest_comments && item.latest_comments.map(comment => (
                      <Text key={comment.id} style={styles.previewCommentText} numberOfLines={1}>
                        <Text style={styles.previewCommentUser}>{comment.username}: </Text>{comment.content}
                      </Text>
                    ))}
                    <Text style={styles.viewMoreText}>View all {item.comment_count} comments...</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.divider} />
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.actionItem}>
                  <Ionicons name={item.isLiked ? "heart" : "heart-outline"} size={22} color={item.isLiked ? "#e74c3c" : "#666"} />
                  <Text style={styles.actionText}>{item.likes_count || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { post: item })} style={styles.actionItem}>
                  <Ionicons name="chatbubble-outline" size={20} color="#666" />
                  <Text style={styles.actionText}>{item.comment_count}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  headerContainer: {
    position: 'absolute',
    top: 0, 
    marginTop: 30,
    left: 0, 
    right: 0,
    zIndex: 10,
    backgroundColor: '#f0f2f5',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingRight: 20,
  },
  notificationBtn: {
    padding: 5,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff3b30',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight:'bold', 
    padding: 15, 
    backgroundColor: 'white', 
    flex: 1 
  },
  createPostContainer: { backgroundColor: 'white', padding: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  postInput: { fontSize: 16, minHeight: 60, textAlignVertical: 'top' },
  createPostActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  iconButton: { flexDirection: 'row', alignItems: 'center' },
  iconText: { marginLeft: 5, color: '#666', fontWeight: '600' },
  publishButton: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  disabledButton: { backgroundColor: '#ccc' },
  publishButtonText: { color: 'white', fontWeight: 'bold' },
  previewContainer: { position: 'relative', marginTop: 10 },
  imagePreview: { width: '100%', height: 150, borderRadius: 10 },
  removeImage: { position: 'absolute', top: 5, right: 5, backgroundColor: 'white', borderRadius: 12 },
  card: { backgroundColor: 'white', padding: 15, marginBottom: 8, elevation: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarLetter: { color: 'white', fontWeight: 'bold' },
  username: { fontWeight: 'bold', fontSize: 15 },
  date: { color: 'gray', fontSize: 12 },
  followTextButton: { padding: 5 },
  followLinkText: { color: '#007AFF', fontWeight: 'bold' },
  followingBadge: { backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
  followingBadgeText: { color: '#666', fontSize: 12 },
  content: { fontSize: 16, color: '#222', marginBottom: 10, lineHeight: 22 },
  postImage: { width: '100%', height: 250, borderRadius: 8, marginVertical: 10 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  actions: { flexDirection: 'row', justifyContent: 'space-around' },
  actionItem: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 8, color: '#666', fontWeight: '500' },
  commentPreviewArea: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, marginTop: 10 },
  previewCommentText: { fontSize: 13, color: '#444', marginBottom: 3 },
  previewCommentUser: { fontWeight: 'bold', color: '#222' },
  viewMoreText: { color: '#007AFF', fontSize: 12, marginTop: 5, fontWeight: '500' },
});