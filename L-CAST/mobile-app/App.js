import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoveryMap from './src/screens/DiscoveryMap';
import SocialFeed from './src/screens/SocialFeed';
import ProfileScreen from './src/screens/ProfileScreen';
import UserListScreen from './src/screens/UserListScreen';
import PostDetail from './src/screens/PostDetail'; // 1. IMPORT POST DETAIL

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainAppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let icon = 'circle';
          if (route.name === 'List') icon = 'list';
          if (route.name === 'Map') icon = 'map';
          if (route.name === 'Community') icon = 'people';
          if (route.name === 'Profile') icon = 'person';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="List" component={HomeScreen} />
      <Tab.Screen name="Map" component={DiscoveryMap} />
      <Tab.Screen name="Community" component={SocialFeed} />
      <Tab.Screen name="Profile" component={ProfileScreen} /> 
    </Tab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      setInitialRoute('Home'); 
    }
    setLoading(false);
  };

  if (loading) return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator /></View>;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={MainAppTabs} options={{ headerShown: false }} />
        
        <Stack.Screen 
          name="UserList" 
          component={UserListScreen} 
          options={({ route }) => ({ 
            title: route.params?.type || 'Users',
            headerShown: true 
          })} 
        />

        {/* 2. ADD POST DETAIL SCREEN HERE */}
        <Stack.Screen 
          name="PostDetail" 
          component={PostDetail} 
          options={{ 
            title: 'Post', 
            headerShown: true // Allow user to go back to the feed
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}