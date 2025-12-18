import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import AppConstants from '../utlis/AppConstants';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AppConstants.colors.error,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: AppConstants.colors.white,
          borderTopWidth: 1,
          borderTopColor: '#ddd',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}