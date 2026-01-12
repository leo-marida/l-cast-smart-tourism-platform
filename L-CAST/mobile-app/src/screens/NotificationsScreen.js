import React, { useState, useEffect } from 'react'; // <--- THIS WAS MISSING
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/social/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'like': return { name: 'heart', color: '#e74c3c' };
      case 'comment': return { name: 'chatbubble', color: '#007AFF' };
      case 'follow': return { name: 'person-add', color: '#2ecc71' };
      default: return { name: 'notifications', color: '#999' };
    }
  };

  const renderItem = ({ item }) => {
    const icon = getIcon(item.type);
    
    return (
      <TouchableOpacity 
        style={styles.notifCard}
        onPress={() => {
          if (item.post_id) {
            navigation.navigate('PostDetail', { postId: item.post_id });
          } else {
            navigation.navigate('UserProfile', { userId: item.sender_id });
          }
        }}
      >
        <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        
        <View style={styles.notifContent}>
          <Text style={styles.notifText}>
            <Text style={styles.boldText}>@{item.sender_name}</Text>
            {item.type === 'like' && ' liked your post.'}
            {item.type === 'comment' && ' commented on your post.'}
            {item.type === 'follow' && ' started following you.'}
          </Text>
          <Text style={styles.timeText}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: { flex: 1 },
  notifText: { fontSize: 15, color: '#333', lineHeight: 20 },
  boldText: { fontWeight: 'bold' },
  timeText: { fontSize: 12, color: '#999', marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 },
});