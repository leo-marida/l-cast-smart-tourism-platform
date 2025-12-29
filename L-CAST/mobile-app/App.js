import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import all your screens
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen'; // You provided this
import HomeScreen from './src/screens/HomeScreen'; // You provided this
import DiscoveryMap from './src/screens/DiscoveryMap'; // Created above
import SocialFeed from './src/screens/SocialFeed'; // Created in previous steps

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// The Main App (Tabs)
function MainAppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'List') iconName = 'list';
          else if (route.name === 'Map') iconName = 'map';
          else if (route.name === 'Community') iconName = 'people';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
      })}
    >
      <Tab.Screen name="List" component={HomeScreen} />
      <Tab.Screen name="Map" component={DiscoveryMap} />
      <Tab.Screen name="Community" component={SocialFeed} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Setup Profile' }} />
        <Stack.Screen name="Home" component={MainAppTabs} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}