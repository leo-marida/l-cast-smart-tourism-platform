import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function UserListScreen({ route }) {
    const { userId, type } = route.params; // userId of the profile being viewed
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const navigation = useNavigation();

    useEffect(() => {
        fetchInitialData();
    }, [userId, type]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Get current user ID to hide follow button on self
            const meRes = await api.get('/api/social/user/me/profile');
            setCurrentUserId(meRes.data.id);

            // 2. Fetch the list of followers/following
            const endpoint = type === 'Followers' ? 'followers' : 'following';
            const res = await api.get(`/api/social/user/${userId}/${endpoint}`);
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching list:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async (targetUser) => {
        // Optimistic UI Update
        const wasFollowing = targetUser.is_following;
        setUsers(prev => prev.map(u => 
            u.id === targetUser.id ? { ...u, is_following: !wasFollowing } : u
        ));

        try {
            if (wasFollowing) {
                await api.delete(`/api/social/user/${targetUser.id}/unfollow`);
            } else {
                await api.post(`/api/social/user/${targetUser.id}/follow`);
            }
        } catch (err) {
            // Revert on error
            setUsers(prev => prev.map(u => 
                u.id === targetUser.id ? { ...u, is_following: wasFollowing } : u
            ));
        }
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
                data={users}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={<Text style={styles.emptyTxt}>No users found.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.userRow}>
                        <TouchableOpacity 
                            style={styles.userInfo}
                            onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                        >
                            <View style={styles.miniAvatar}>
                                <Text style={styles.avatarTxt}>
                                    {item.username ? item.username[0].toUpperCase() : '?'}
                                </Text>
                            </View>
                            <Text style={styles.username}>@{item.username}</Text>
                        </TouchableOpacity>

                        {/* Show Follow/Unfollow button only if it's NOT me */}
                        {currentUserId !== item.id && (
                            <TouchableOpacity 
                                style={[styles.actionBtn, item.is_following ? styles.followingBtn : styles.followBtn]}
                                onPress={() => handleFollowToggle(item)}
                            >
                                <Text style={[styles.actionBtnTxt, item.is_following ? styles.followingBtnTxt : styles.followBtnTxt]}>
                                    {item.is_following ? 'Following' : 'Follow'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    userRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: 15, 
        borderBottomWidth: 1, 
        borderBottomColor: '#eee' 
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    miniAvatar: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: '#007AFF', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 15 
    },
    avatarTxt: { color: '#fff', fontWeight: 'bold' },
    username: { fontSize: 16, fontWeight: '500' },
    emptyTxt: { textAlign: 'center', marginTop: 50, color: '#999' },
    
    // Button Styles
    actionBtn: {
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
    },
    followBtn: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    followingBtn: {
        backgroundColor: '#fff',
        borderColor: '#ccc',
    },
    actionBtnTxt: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    followBtnTxt: { color: '#fff' },
    followingBtnTxt: { color: '#666' }
});