import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import socket from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MessagesScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myId, setMyId] = useState(null);

  // 1. Get My ID
  useEffect(() => {
    const getId = async () => {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
            setMyId(JSON.parse(userStr).id);
        } else {
            try {
                const res = await api.get('/api/social/user/me/profile');
                setMyId(res.data.id);
            } catch (e) { console.log(e); }
        }
    };
    getId();
  }, []);

  // 2. Load Data on Screen Focus
  useFocusEffect(
    useCallback(() => {
      if (!searchQuery) loadConversations();
    }, [searchQuery])
  );

  // 3. LISTEN FOR NEW MESSAGES
  useEffect(() => {
    if (!myId) return;

    if (!socket.connected) socket.connect();
    socket.emit('join', myId);

    const handleNewMessage = (newMsg) => {
        setConversations(prev => {
            const otherUserId = newMsg.sender_id == myId ? newMsg.receiver_id : newMsg.sender_id;
            
            // Remove old entry
            const others = prev.filter(c => c.other_user_id != otherUserId);
            // Get existing data
            const existing = prev.find(c => c.other_user_id == otherUserId);
            
            const updated = {
                ...existing,
                other_user_id: otherUserId,
                other_username: existing ? existing.other_username : 'User', 
                content: newMsg.content,
                created_at: newMsg.created_at,
                sender_id: newMsg.sender_id, 
                is_read: newMsg.sender_id == myId ? true : false, 
            };

            return [updated, ...others];
        });
    };

    socket.on('receive_message', handleNewMessage);
    return () => { socket.off('receive_message', handleNewMessage); };
  }, [myId]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/messages/conversations');
      // --- FILTER 1: Hide SuperAdmin from Inbox ---
      const filtered = res.data.filter(c => c.other_username !== 'SuperAdmin');
      setConversations(filtered);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
        try {
            const res = await api.get(`/api/messages/search?q=${text}`);
            // --- FILTER 2: Hide SuperAdmin from Search Results ---
            const filtered = res.data.filter(u => u.username !== 'SuperAdmin');
            setSearchResults(filtered);
        } catch (e) {}
    } else {
        setSearchResults([]);
    }
  };

  const openChat = (item) => {
    const isSearch = !!item.username;
    const targetId = isSearch ? item.id : item.other_user_id;
    const targetName = isSearch ? item.username : item.other_username;
    navigation.navigate('ChatScreen', { userId: targetId, username: targetName });
  };

  const renderItem = ({ item }) => {
    const isSearch = !!item.username;
    const name = isSearch ? item.username : item.other_username;
    const subtitle = isSearch ? 'Tap to message' : item.content;
    const time = !isSearch && item.created_at ? new Date(item.created_at).toLocaleDateString() : '';

    const amISender = item.sender_id == myId; 
    const showRedDot = !isSearch && !item.is_read && !amISender;

    return (
      <TouchableOpacity style={styles.chatRow} onPress={() => openChat(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name ? name[0].toUpperCase() : '?'}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.rowTop}>
            <Text style={styles.username}>{name}</Text>
            {showRedDot && <View style={styles.redDot} />}
          </View>
          <View style={{flexDirection:'row', justifyContent:'space-between'}}>
             <Text 
                numberOfLines={1} 
                style={[styles.messagePreview, showRedDot && styles.unreadText]}
             >
                {subtitle}
             </Text>
             <Text style={styles.time}>{time}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Helper to filter data before rendering (Double safety)
  const getData = () => {
      const data = searchQuery ? searchResults : conversations;
      return data.filter(item => {
          const name = item.username || item.other_username;
          return name !== 'SuperAdmin';
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={{marginRight: 10}} />
        <TextInput 
            style={styles.searchInput} 
            placeholder="Search users..." 
            value={searchQuery} 
            onChangeText={handleSearch} 
        />
         {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); loadConversations(); }}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{marginTop: 20}} size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={getData()} // <--- FILTER 3: Applied here
          keyExtractor={(item) => (item.id || item.other_user_id || Math.random()).toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5', margin: 15, paddingHorizontal: 15, borderRadius: 20, height: 45 },
  searchInput: { flex: 1, fontSize: 16 },
  chatRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' },
  username: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  messagePreview: { fontSize: 14, color: '#666', flex: 1, marginRight: 10 },
  unreadText: { color: '#000', fontWeight: 'bold' },
  time: { fontSize: 12, color: '#999' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#888', fontStyle: 'italic' },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', marginLeft: 8 }
});