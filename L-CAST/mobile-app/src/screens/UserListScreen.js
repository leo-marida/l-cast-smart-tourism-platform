import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import api from '../services/api';

export default function UserListScreen({ route }) {
    const { userId, type } = route.params;
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const endpoint = type === 'Followers' ? 'followers' : 'following';
            const res = await api.get(`/api/social/user/${userId}/${endpoint}`);
            setUsers(res.data);
        };
        fetchUsers();
    }, []);

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.userRow}>
                        <View style={styles.miniAvatar}>
                            <Text style={styles.avatarTxt}>{item.username[0].toUpperCase()}</Text>
                        </View>
                        <Text style={styles.username}>@{item.username}</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    userRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    miniAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarTxt: { color: '#fff', fontWeight: 'bold' },
    username: { fontSize: 16, fontWeight: '500' }
});