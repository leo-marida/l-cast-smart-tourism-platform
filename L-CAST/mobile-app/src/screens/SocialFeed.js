import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  StyleSheet, Alert, Image, Animated, RefreshControl, Modal, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const STORAGE_KEY = '@seen_stories';
const { width } = Dimensions.get('window');

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); 
  const [followingIds, setFollowingIds] = useState([]); 
  const [currentUserId, setCurrentUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);

  // --- STORY VIEWER STATE ---
  const [storyVisible, setStoryVisible] = useState(false);
  const [activeUserIndex, setActiveUserIndex] = useState(0); 
  const [activeStoryIndex, setActiveStoryIndex] = useState(0); 
  const [seenStoryIds, setSeenStoryIds] = useState([]); 
  const storyProgress = useRef(new Animated.Value(0)).current;

  const navigation = useNavigation();
  const BASE_URL = api.defaults.baseURL;

  // --- HEADER ANIMATION LOGIC ---
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
          Animated.timing(headerTranslate, { toValue: -400, duration: 250, useNativeDriver: true }).start();
        } else if (diff < -5) {
          Animated.timing(headerTranslate, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        }
        lastScrollY.current = currentY;
      },
    }
  );

  // --- PERSISTENCE LOGIC ---
  const loadSeenStories = async () => {
    try {
      const storedIds = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedIds !== null) {
        setSeenStoryIds(JSON.parse(storedIds));
      }
    } catch (e) { console.error("Failed to load seen stories"); }
  };

  const saveSeenStory = async (id) => {
    try {
      const updatedIds = [...new Set([...seenStoryIds, id])];
      setSeenStoryIds(updatedIds);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIds));
    } catch (e) { console.error("Failed to save seen story"); }
  };

  // --- DATA FETCHING ---
  const fetchStories = async () => {
    try {
      const res = await api.get('/api/social/stories');
      setStories(res.data);
    } catch (err) { console.error("Error fetching stories:", err); }
  };

  const fetchPosts = async () => {
    try {
      const res = await api.get('/api/social/feed');
      setPosts(res.data.map(p => ({ 
        ...p, 
        isLiked: p.is_liked || false,
        comment_count: parseInt(p.comment_count) || 0 
      })));
      const idsFromServer = res.data.filter(p => p.is_following === true).map(p => p.user_id);
      setFollowingIds([...new Set(idsFromServer)]);
    } catch (err) { console.error(err); }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await api.get('/api/social/user/me/profile'); 
      setCurrentUserId(res.data.id);
    } catch (err) { console.log(err); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchStories()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
      fetchStories();
      loadSeenStories(); // Load seen status whenever screen is focused
    }, [])
  );

  useEffect(() => {
    fetchMyProfile();
  }, []);

  // --- STORY ACTIONS ---
  const startStoryTimer = () => {
    storyProgress.setValue(0);
    Animated.timing(storyProgress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) nextStory();
    });
  };

  const nextStory = () => {
    const currentUserGroup = stories[activeUserIndex];
    if (!currentUserGroup) return;

    if (activeStoryIndex < currentUserGroup.stories.length - 1) {
      // Next story for SAME user
      const nextId = currentUserGroup.stories[activeStoryIndex + 1].id;
      saveSeenStory(nextId);
      setActiveStoryIndex(activeStoryIndex + 1);
    } else if (activeUserIndex < stories.length - 1) {
      // Move to NEXT user
      const nextUserId = stories[activeUserIndex + 1].stories[0].id;
      saveSeenStory(nextUserId);
      setActiveUserIndex(activeUserIndex + 1);
      setActiveStoryIndex(0);
    } else {
      closeStory();
    }
  };

  const prevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else if (activeUserIndex > 0) {
      setActiveUserIndex(activeUserIndex - 1);
      setActiveStoryIndex(stories[activeUserIndex - 1].stories.length - 1);
    }
  };

  const openStoryGroup = (index) => {
    setActiveUserIndex(index);
    setActiveStoryIndex(0);
    setStoryVisible(true);
    saveSeenStory(stories[index].stories[0].id);
  };

  const closeStory = () => {
    storyProgress.stopAnimation();
    setStoryVisible(false);
  };

  useEffect(() => {
    if (storyVisible) startStoryTimer();
  }, [activeStoryIndex, activeUserIndex, storyVisible]);

  // Handle Post Story Upload
  const handlePickStoryImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.7,
    });

    if (!result.canceled) {
      const formData = new FormData();
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('image', { uri, name: filename, type });

      try {
        await api.post('/api/social/story', formData, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
        fetchStories();
        Alert.alert("Success", "Story posted!");
      } catch (err) { Alert.alert("Error", "Could not upload story."); }
    }
  };

  // --- POST ACTIONS ---
  const pickImage = async () => {
    if (editingPostId) return;
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
      if (editingPostId) {
        await api.put(`/api/social/post/${editingPostId}`, { content: newPost });
        setEditingPostId(null);
      } else {
        const formData = new FormData();
        formData.append('content', newPost);
        if (selectedImage) {
          const filename = selectedImage.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image`;
          formData.append('image', { uri: selectedImage, name: filename, type });
        }
        await api.post('/api/social/post', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setNewPost(''); setSelectedImage(null); fetchPosts(); 
    } catch(err) { Alert.alert("Error", "Could not process request."); }
  };

  const handlePostOptions = (post) => {
    Alert.alert("Post Options", "What would you like to do?", [
      { text: "Edit", onPress: () => { setEditingPostId(post.id); setNewPost(post.content); } },
      { text: "Delete", style: "destructive", onPress: () => confirmDelete(post.id) },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const confirmDelete = async (postId) => {
    try {
      await api.delete(`/api/social/post/${postId}`);
      setPosts(curr => curr.filter(p => p.id !== postId));
    } catch (err) { Alert.alert("Error", "Delete failed."); }
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

  const handleFollow = async (userId) => {
    const isCurrentlyFollowing = followingIds.includes(userId);
    setFollowingIds(prev => isCurrentlyFollowing ? prev.filter(id => id !== userId) : [...prev, userId]);
    try {
      if (isCurrentlyFollowing) await api.delete(`/api/social/user/${userId}/unfollow`);
      else await api.post(`/api/social/user/${userId}/follow`);
    } catch (err) { fetchPosts(); }
  };

  const navigateToProfile = (targetUserId) => {
    if (targetUserId === currentUserId) navigation.navigate('Profile'); 
    else navigation.navigate('UserProfile', { userId: targetUserId });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'white', zIndex: 11 }} />
      
      <Animated.View style={[styles.headerContainer, { transform: [{ translateY: headerTranslate }] }]}>
        <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Community Pulse</Text>
            <TouchableOpacity style={styles.notificationBtn} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications-outline" size={26} color="#333" />
                <View style={styles.unreadBadge} />
            </TouchableOpacity>
        </View>

        {/* --- STORIES TRAY --- */}
        <View style={styles.storiesWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={stories}
            keyExtractor={(item) => 'group-' + item.user_id}
            ListHeaderComponent={() => (
              <TouchableOpacity style={styles.storyCircleContainer} onPress={handlePickStoryImage}>
                <View style={[styles.storyCircle, { borderColor: '#ccc', borderStyle: 'dashed' }]}>
                   <Ionicons name="add" size={30} color="#007AFF" />
                </View>
                <Text style={styles.storyUsername}>Your Story</Text>
              </TouchableOpacity>
            )}
            renderItem={({ item, index }) => {
              // Highlight circle if ANY story in group is unseen
              const hasUnseen = item.stories.some(s => !seenStoryIds.includes(s.id));
              return (
                <TouchableOpacity 
                  style={styles.storyCircleContainer}
                  onPress={() => openStoryGroup(index)}
                >
                  <View style={[styles.storyCircle, { borderColor: hasUnseen ? '#007AFF' : '#ccc' }]}>
                    <View style={styles.avatarPlaceholderSmall}>
                      <Text style={styles.avatarLetterSmall}>{item.username[0].toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.storyUsername} numberOfLines={1}>{item.username}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={styles.createPostContainer}>
          {editingPostId && (
            <View style={styles.editLabelRow}>
              <Text style={styles.editLabel}>Editing Post...</Text>
              <TouchableOpacity onPress={() => { setEditingPostId(null); setNewPost(''); }}>
                <Text style={styles.cancelEdit}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <TextInput 
            style={styles.postInput} 
            placeholder={editingPostId ? "Edit your post..." : "What's happening?"} 
            multiline 
            value={newPost} 
            onChangeText={setNewPost} 
          />
          {selectedImage && !editingPostId && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                <Ionicons name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.createPostActions}>
            {!editingPostId ? (
              <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                <Ionicons name="image-outline" size={24} color="#007AFF" />
                <Text style={styles.iconText}>Photo</Text>
              </TouchableOpacity>
            ) : <View />}
            
            <TouchableOpacity 
              onPress={handlePost} 
              style={[styles.publishButton, (!newPost && !selectedImage) && styles.disabledButton]}
            >
              <Text style={styles.publishButtonText}>{editingPostId ? "Update" : "Post"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={posts}
        contentContainerStyle={{ paddingTop: 320, paddingBottom: 100 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={320} />
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
                    onPress={() => navigateToProfile(item.user_id)}
                >
                  <View style={styles.avatarPlaceholder}>
                     <Text style={styles.avatarLetter}>{item.username ? item.username[0].toUpperCase() : '?'}</Text>
                  </View>
                  <View>
                    <Text style={styles.username}>@{item.username}</Text>
                    <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>

                {isMe ? (
                  <TouchableOpacity onPress={() => handlePostOptions(item)} style={styles.optionsBtn}>
                    <Ionicons name="ellipsis-horizontal" size={22} color="#666" />
                  </TouchableOpacity>
                ) : currentUserId && (
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

      {/* --- STORY VIEWER MODAL --- */}
      <Modal visible={storyVisible} transparent={false} animationType="fade" onRequestClose={closeStory}>
        <View style={styles.storyModalContainer}>
          {stories[activeUserIndex] && (
            <>
              <Image 
                source={{ uri: `${BASE_URL}${stories[activeUserIndex].stories[activeStoryIndex].image_url}` }} 
                style={styles.fullStoryImage} 
                resizeMode="cover"
              />
              
              {/* TOP SEGMENTED PROGRESS BARS */}
              <View style={styles.multiProgressContainer}>
                {stories[activeUserIndex].stories.map((_, idx) => (
                  <View key={idx} style={styles.progressSegmentBackground}>
                    <Animated.View style={[
                      styles.progressSegmentFill, 
                      { 
                        width: idx === activeStoryIndex ? storyProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) 
                               : idx < activeStoryIndex ? '100%' : '0%' 
                      }
                    ]} />
                  </View>
                ))}
              </View>

              <View style={styles.storyHeader}>
                <View style={styles.storyHeaderUser}>
                  <View style={styles.avatarPlaceholderSmall}>
                    <Text style={styles.avatarLetterSmall}>
                      {stories[activeUserIndex].username[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.storyHeaderUsername}>{stories[activeUserIndex].username}</Text>
                </View>
                <TouchableOpacity onPress={closeStory}>
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
              </View>

              {/* TAP REGIONS */}
              <View style={styles.navigationOverlay}>
                <TouchableOpacity style={styles.navSide} onPress={prevStory} />
                <TouchableOpacity style={styles.navSide} onPress={nextStory} />
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  headerContainer: { position: 'absolute', top: 0, marginTop: 30, left: 0, right: 0, zIndex: 10, backgroundColor: '#f0f2f5',},
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', paddingRight: 20, },
  notificationBtn: { padding: 5, position: 'relative' },
  unreadBadge: {position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff3b30', borderWidth: 1.5, borderColor: 'white', },
  headerTitle: { fontSize: 24, fontWeight:'bold', padding: 15, backgroundColor: 'white', flex: 1 },
  storiesWrapper: { backgroundColor: 'white', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  storyCircleContainer: { alignItems: 'center', marginHorizontal: 8, width: 70 },
  storyCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4
  },
  storyUsername: { fontSize: 11, color: '#444', textAlign: 'center' },
  avatarPlaceholderSmall: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#eee',
    justifyContent: 'center', alignItems: 'center'
  },
  avatarLetterSmall: { fontWeight: 'bold', color: '#777', fontSize: 16 },
  storyModalContainer: { flex: 1, backgroundColor: 'black' },
  fullStoryImage: { width: '100%', height: '100%' },
  progressContainer: {
    position: 'absolute', top: 50, left: 10, right: 10, height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: 'white' },
  storyHeader: {
    position: 'absolute', top: 65, left: 15, right: 15,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  storyHeaderUser: { flexDirection: 'row', alignItems: 'center' },
  storyHeaderUsername: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 16 },
  createPostContainer: { backgroundColor: 'white', padding: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  editLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  editLabel: { color: '#007AFF', fontWeight: 'bold', fontSize: 12 },
  cancelEdit: { color: 'red', fontSize: 12 },
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
  optionsBtn: { padding: 5 },
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
  multiProgressContainer: { position: 'absolute', top: 50, left: 10, right: 10, flexDirection: 'row', height: 3, gap: 5},
  progressSegmentBackground: {flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden'},
  progressSegmentFill: { height: '100%', backgroundColor: 'white'},
  navigationOverlay: {...StyleSheet.absoluteFillObject, flexDirection: 'row', marginTop: 100 },
  navSide: { flex: 1 }
});