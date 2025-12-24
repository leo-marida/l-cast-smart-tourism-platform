import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet } from 'react-native';
import api from '../services/api';

export default function SocialFeed({ poiId }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");

  const loadFeed = async () => {
    const res = await api.get(`/api/pois/${poiId}/feed`);
    setPosts(res.data);
  };

  const submitPost = async () => {
    await api.post('/api/posts', { poi_id: poiId, content: newPost, rating: 5 });
    setNewPost("");
    loadFeed();
  };

  useEffect(() => { loadFeed(); }, []);

  return (
    <View style={styles.container}>
      <TextInput 
        placeholder="Share a safety update or review..." 
        value={newPost} 
        onChangeText={setNewPost} 
        style={styles.input}
      />
      <Button title="Post to L-CAST" onPress={submitPost} />
      <FlatList 
        data={posts}
        renderItem={({item}) => (
          <View style={styles.postCard}>
            <Text style={styles.user}>{item.username}:</Text>
            <Text>{item.content}</Text>
          </View>
        )}
      />
    </View>
  );
}