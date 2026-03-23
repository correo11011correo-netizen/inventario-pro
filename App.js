import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import StockScreen from './screens/StockScreen';
import VentasScreen from './screens/VentasScreen';

const Tab = createBottomTabNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#020617',
    card: '#0f172a',
    text: '#ffffff',
    border: '#1e293b',
    primary: '#6366f1',
  },
};

function MyTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: '#0f172a',
          borderBottomWidth: 1,
          borderBottomColor: '#1e293b',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '900',
          textTransform: 'uppercase',
          fontSize: 14,
          letterSpacing: 1,
          color: '#818cf8',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = route.name === 'Stock' 
            ? (focused ? 'cube' : 'cube-outline') 
            : (focused ? 'cart' : 'cart-outline');
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          position: 'absolute',
          bottom: insets.bottom > 0 ? insets.bottom : 15, // Detección automática de barra de Android
          left: 15,
          right: 15,
          backgroundColor: '#0f172a',
          borderRadius: 20,
          height: 65,
          elevation: 10,
          borderTopWidth: 0,
          paddingBottom: 0,
        },
        tabBarLabelStyle: {
          fontWeight: '900',
          fontSize: 10,
          textTransform: 'uppercase',
          marginBottom: 8,
        },
      })}
    >
      <Tab.Screen name="Stock" component={StockScreen} options={{ title: '📦 GESTIÓN DE STOCK' }} />
      <Tab.Screen name="Ventas" component={VentasScreen} options={{ title: '🛒 PRESUPUESTOS' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <NavigationContainer theme={MyTheme}>
        <MyTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
