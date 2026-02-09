import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, FlatList, StyleSheet, Platform, 
  TouchableOpacity, SafeAreaView, Alert, Keyboard, Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import socket from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYBOARD_EXTRA_GAP = 10; 

export default function ChatScreen({ route, navigation }) {
  const { userId, id, username, name } = route.params;
  const targetUserId = userId || id; 
  const displayUsername = username || name || "User";

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSafe, setIsSafe] = useState(true); 
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [myId, setMyId] = useState(null);
  
  const flatListRef = useRef();
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // --- REMOVED GREEN BUTTON FROM HERE --- 
  useEffect(() => {
    navigation.setOptions({ title: displayUsername });
  }, [displayUsername]);

  // --- KEYBOARD ANIMATION ---
  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, { duration: 200, toValue: e.endCoordinates.height + KEYBOARD_EXTRA_GAP, useNativeDriver: false }).start();
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      Animated.timing(keyboardHeight, { duration: 200, toValue: 0, useNativeDriver: false }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initChat = async () => {
      // 1. Get ID
      const userStr = await AsyncStorage.getItem('user'); 
      const currentUserId = userStr ? JSON.parse(userStr).id : (await api.get('/api/social/user/me/profile')).data.id;
      setMyId(currentUserId);

      // 2. Connect Socket
      if (!socket.connected) socket.connect();
      socket.emit('join', currentUserId);

      // 3. Fetch History
      if (targetUserId) {
          fetchMessages(targetUserId);
          markAsRead(targetUserId); // <--- NEW: Mark read immediately
      }
    };
    initChat();
  }, [targetUserId]);

  // --- REAL-TIME LISTENER ---
  useEffect(() => {
    if (!myId) return;

    const handleMessage = (newMessage) => {
      const isRelated = 
          (newMessage.sender_id == targetUserId && newMessage.receiver_id == myId) || 
          (newMessage.sender_id == myId && newMessage.receiver_id == targetUserId);

      if (isRelated) {
        setMessages(prev => {
           if (prev.some(m => m.id === newMessage.id)) return prev;
           return [...prev, newMessage];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        // If I am receiving a message while looking at the screen, mark it read instantly
        if (newMessage.sender_id == targetUserId) {
            markAsRead(targetUserId);
        }
      }
    };

    socket.on('receive_message', handleMessage);
    return () => { socket.off('receive_message', handleMessage); };
  }, [myId, targetUserId]);

  const fetchMessages = async (id) => {
    try {
      const res = await api.get(`/api/messages/${id}`);
      setMessages(res.data.messages);
      setIsSafe(res.data.isSafe);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
    } catch (err) { console.error(err); }
  };

  // --- NEW FUNCTION: Mark messages as read ---
  const markAsRead = async (id) => {
      try {
          await api.put(`/api/messages/${id}/read`);
      } catch (e) {
          console.log("Failed to mark read", e);
      }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const content = inputText;
    setInputText(''); 

    // Optimistic Update
    const tempId = Math.random().toString();
    const optimisticMsg = {
        id: tempId, content, sender_id: myId, receiver_id: targetUserId, created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await api.post(`/api/messages/${targetUserId}`, { content });
      setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
    } catch (err) {
      Alert.alert("Error", "Message failed");
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(content);
    }
  };

  const showWarning = !isSafe && !warningAccepted && messages.length === 0;

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id == myId;
    return (
      <View style={[styles.bubbleContainer, isMe ? styles.rightContainer : styles.leftContainer]}>
        <View style={[styles.bubble, isMe ? styles.rightBubble : styles.leftBubble]}>
          <Text style={[styles.msgText, isMe ? styles.whiteText : styles.darkText]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.lightTime : styles.darkTime]}>
            {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#e5ddd5' }}>
        <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
        />
        <Animated.View style={{ marginBottom: keyboardHeight }}>
          {showWarning ? (
              <View style={styles.warningContainer}>
                  <Ionicons name="shield-checkmark" size={32} color="#f39c12" />
                  <Text style={styles.warningTitle}>Message Request</Text>
                  <Text style={styles.warningText}>{displayUsername} does not follow you.</Text>
                  <View style={styles.warningBtnRow}>
                      <TouchableOpacity style={styles.blockBtn} onPress={() => navigation.goBack()}>
                          <Text style={styles.btnText}>Exit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.acceptBtn} onPress={() => setWarningAccepted(true)}>
                          <Text style={styles.btnText}>Accept</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          ) : (
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type a message..." multiline />
                <TouchableOpacity onPress={sendMessage} style={{marginLeft: 10}}><Ionicons name="send" size={24} color="#007AFF" /></TouchableOpacity>
            </View>
          )}
        </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: { flexDirection: 'row', marginVertical: 5 },
  leftContainer: { justifyContent: 'flex-start' },
  rightContainer: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 15 },
  leftBubble: { backgroundColor: '#fff', borderTopLeftRadius: 0 },
  rightBubble: { backgroundColor: '#007AFF', borderTopRightRadius: 0 },
  msgText: { fontSize: 16 },
  whiteText: { color: '#fff' },
  darkText: { color: '#000' },
  timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  lightTime: { color: 'rgba(255,255,255,0.7)' },
  darkTime: { color: 'rgba(0,0,0,0.5)' },
  inputWrapper: { flexDirection: 'row', padding: 10, backgroundColor: '#f0f0f0', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, fontSize: 16 },
  warningContainer: { backgroundColor: '#fff', padding: 20, alignItems: 'center', borderTopWidth: 1, borderColor: '#ddd' },
  warningTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 5 },
  warningText: { textAlign: 'center', color: '#666', marginBottom: 15 },
  warningBtnRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  blockBtn: { backgroundColor: '#e74c3c', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8 },
  acceptBtn: { backgroundColor: '#2ecc71', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});